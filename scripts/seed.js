import mongoose from "mongoose";
import { Conversation, Message } from "../src/modules/chat/chat.repo.js";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chat-app";
await mongoose.connect(uri, { dbName: process.env.MONGO_DB || "chat-app" });

const U1 = new mongoose.Types.ObjectId();
const U2 = new mongoose.Types.ObjectId();

const conv = await Conversation.create({
  type: "single",
  name: "Dev Chat",
  members: [
    { userId: U1, role: "member", joinedAt: new Date() },
    { userId: U2, role: "member", joinedAt: new Date() },
  ],
});

console.log("U1 =", String(U1));
console.log("U2 =", String(U2));
console.log("conversationId =", String(conv._id));

await mongoose.disconnect(); process.exit(0);
