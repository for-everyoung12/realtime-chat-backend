import { io } from "socket.io-client";
const userId = "68976e941a7072905ef58df7";
const conversationId = "68976e951a7072905ef58df9";
const s = io("http://localhost:8080/chat", { auth: { userId } });
s.on("connect", () => {
  console.log("connected as", userId);
  s.emit("join", { conversationId });
  s.on("msg:new", (m) => console.log("msg:new >", m.content));
  s.emit("msg:send", { conversationId, type: "text", content: "WS hello" }, console.log);
});
