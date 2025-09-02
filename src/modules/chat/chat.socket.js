import jwt from "jsonwebtoken";
import {
  wsEventsTotal,
  wsConnectedGauge,
  wsBroadcastTotal,
} from "../common/obs/metrics.js";
import {
  createMessage,
  markMessageRead,
  ensureMember,
} from "./chat.service.js";
import { redis } from "../common/cache/redis.js";
import { User } from "../common/db/user.model.js";
import { logger } from "../common/obs/logger.js";
import { isMember } from "../common/cache/member.js";

const TYPING_TTL_MS = 2500;

// ---- helper
function getUserFromCookie(socket) {
  try {
    const raw = socket.request.headers.cookie || "";
    const cookieName = (process.env.COOKIE_NAME || "chat_token") + "=";
    const part = raw.split("; ").find((v) => v.startsWith(cookieName));
    if (!part) return null;
    const token = part.slice(cookieName.length);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Token bucket đơn giản (mặc định 60 req/phút/loại)
async function wsRateLimit(key, limit = 60, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000);
  const k = `rl:${key}:${Math.floor(now / windowSec)}`;
  const v = await redis.incr(k);
  if (v === 1) await redis.expire(k, windowSec);
  return v <= limit;
}

export function registerChatNamespace(nsp) {
  // Auth
  nsp.use((socket, next) => {
    if (
      process.env.NODE_ENV !== "production" &&
      socket.handshake.auth?.userId
    ) {
      socket.data.userId = socket.handshake.auth.userId;
      return next();
    }
    const user = getUserFromCookie(socket);
    if (!user) return next(new Error("UNAUTHORIZED"));
    socket.data.userId = user.id;
    next();
  });

  // tiện ích: chỉ emit presence cho các socket đã subscribe user đó
  function emitPresence(userId, payload) {
    for (const [, s] of nsp.sockets) {
      if (s.data?.subscriptions?.has(userId)) {
        s.emit("presence:update", payload);
      }
    }
  }

  nsp.on("connection", (socket) => {
    const typingTimers = new Map();
    const userId = String(socket.data.userId);
    const key = `presence:sockets:${userId}`; // set các socket.id của user
    wsConnectedGauge.inc();

    // khởi tạo subscriptions per-socket
    socket.data.subscriptions = new Set();

    (async () => {
      try {
        await redis.sadd(key, socket.id);
        // optional TTL cho set để dọn dẹp
        await redis.expire(key, 24 * 60 * 60);
        await User.findByIdAndUpdate(userId, { $set: { status: "online" } }).exec();

        // phát cho ai đã subscribe
        emitPresence(userId, { userId, status: "online" });
        // hoặc broadcast toàn namespace nếu muốn:
        // nsp.emit("presence:update", { userId, status: "online" });
      } catch (e) {
        logger.error(e, "set online failed");
      }
    })();

    socket.on("disconnect", async () => {
      wsConnectedGauge.dec();

      try {
        await redis.srem(key, socket.id);

        setTimeout(async () => {
          const remain = await redis.scard(key); // số phiên còn lại
          if (remain === 0) {
            await User.findByIdAndUpdate(userId, {
              $set: { status: "offline", lastOnline: new Date() },
            }).exec();
            emitPresence(userId, {
              userId,
              status: "offline",
              lastOnline: new Date(),
            });
            // hoặc broadcast:
            // nsp.emit("presence:update", { userId, status: "offline", lastOnline: new Date() });
          }
        }, 5000);
      } catch (e) {
        logger.error(e, "set disconnect failed");
      }
    });

    // presence - subscribe
    socket.on("presence:subscribe", ({ userIds }) => {
      (userIds || []).forEach((id) => socket.data.subscriptions.add(String(id)));
    });

    // presence - unsubscribe
    socket.on("presence:unsubscribe", ({ userIds }) => {
      (userIds || []).forEach((id) => socket.data.subscriptions.delete(String(id)));
    });

    // presence - who
    socket.on("presence:who", async ({ userIds }, cb) => {
      try {
        const ids = (userIds || []).map(String);
        const users = await User.find({ _id: { $in: ids } })
          .select("_id status lastOnline")
          .lean();

        const statuses = Object.fromEntries(
          users.map((u) => [String(u._id), u.status || "offline"])
        );

        cb && cb({ ok: true, statuses });
      } catch (e) {
        cb && cb({ ok: false, error: e.message || "WHO_FAILED" });
      }
    });

    socket.on("join", async ({ conversationId }, cb) => {
      try {
        await ensureMember(conversationId, userId);
        socket.join(String(conversationId));
        wsEventsTotal.labels("join").inc();
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on("leave", ({ conversationId }) => {
      socket.leave(String(conversationId));
      wsEventsTotal.labels("leave").inc();
    });

    socket.on("msg:send", async (payload, cb) => {
      try {
        const allowed = await wsRateLimit(`send:${userId}`, 120, 60); // 120 msg/phút
        if (!allowed) return cb && cb({ ok: false, error: "RATE_LIMITED" });

        await ensureMember(payload.conversationId, userId);
        const msg = await createMessage({ ...payload, senderId: userId });
        nsp.to(String(msg.conversationId)).emit("msg:new", msg);
        wsBroadcastTotal.labels("msg:new").inc();
        wsEventsTotal.labels("msg:send").inc();
        const timer = setTimeout(() => {
          try {
            cb && cb({ ok: true, id: String(msg._id) });
          } catch {}
        }, 800);
        try {
          cb && cb({ ok: true, id: String(msg._id) });
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        cb && cb({ ok: false, error: e.message || "SEND_FAILED" });
      }
    });

    socket.on("message:read", async ({ messageId }, cb) => {
      try {
        const allowed = await wsRateLimit(`read:${userId}`, 300, 60);
        if (!allowed) return cb && cb({ ok: false, error: "RATE_LIMITED" });

        const { updated, conversationId } = await markMessageRead({
          messageId,
          userId,
        });
        nsp.to(String(conversationId)).emit("message:readBy", {
          messageId: String(updated._id),
          userId,
          readBy: updated.readBy.map((x) => String(x)),
          conversationId: String(conversationId),
        });
        wsBroadcastTotal.labels("message:readBy").inc();
        wsEventsTotal.labels("message:read").inc();
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message || "READ_FAILED" });
      }
    });

    socket.on("typing:start", async ({ conversationId }) => {
      if (!(await isMember(conversationId, userId))) return;
      if (typingTimers.get(conversationId)) return;
      nsp
        .to(String(conversationId))
        .emit("typing", { conversationId, userId, isTyping: true });
      const t = setTimeout(() => {
        nsp
          .to(String(conversationId))
          .emit("typing", { conversationId, userId, isTyping: false });
        typingTimers.delete(conversationId);
      }, TYPING_TTL_MS);
      typingTimers.set(conversationId, t);
      wsBroadcastTotal.labels("typing").inc();
    });

    socket.on("typing:stop", async ({ conversationId }) => {
      if (!(await isMember(conversationId, userId))) return;
      nsp
        .to(String(conversationId))
        .emit("typing", { conversationId, userId, isTyping: false });
      wsBroadcastTotal.labels("typing").inc();
    });
  });
}