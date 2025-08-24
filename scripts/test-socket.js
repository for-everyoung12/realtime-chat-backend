import { io } from "socket.io-client";
const userId = "68996994725e35f6c4e85905";
const conversationId = "68996fc6c38dc47143d22f4d";
const s = io("http://localhost:8080/chat", { auth: { userId } });
s.on("connect", () => {
  console.log("connected as", userId);
  s.emit("join", { conversationId });
  s.on("msg:new", (m) => console.log("msg:new >", m.content));
  s.emit("msg:send", { conversationId, type: "text", content: "WS hello" }, console.log);
});
