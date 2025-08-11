// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import { User } from "../src/modules/common/db/user.model.js";
// import { Conversation, Message } from "../src/modules/chat/chat.repo.js";

// const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chat-app";
// const dbName = process.env.MONGO_DB || "chat-app";

// async function main() {
//   await mongoose.connect(uri, { dbName });

//   const users = [];
//   for (let i = 1; i <= 100; i++) {
//     users.push({
//       name: `User${i}`,
//       email: `user${i}@example.com`,
//       passwordHash: await bcrypt.hash("123456", 10),
//       status: "online",
//     });
//   }
//   const inserted = await User.insertMany(users, { ordered: false });

//   const u1 = inserted[0]._id;
//   const u2 = inserted[1]._id;

//   const conv = await Conversation.create({
//     type: "single",
//     name: "Dev Chat",
//     members: [
//       { userId: u1, role: "member", joinedAt: new Date() },
//       { userId: u2, role: "member", joinedAt: new Date() },
//     ],
//     updatedAt: new Date(),
//   });

//   await Message.insertMany([
//     { conversationId: conv._id, senderId: u1, type: "text", content: "Hello!", createdAt: new Date() },
//     { conversationId: conv._id, senderId: u2, type: "text", content: "Hi 👋", createdAt: new Date() },
//   ]);

//   await mongoose.disconnect();
//   console.log("✅ Seed done");
// }

// main().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {}; process.exit(1); });


// ==============================================

// import mongoose from "mongoose";
// import { Message } from "../src/modules/chat/chat.repo.js";

// const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chat-app";
// const dbName = process.env.MONGO_DB || "chat-app";

// async function seedMessages() {
//   await mongoose.connect(uri, { dbName });

//   const conversationId = new mongoose.Types.ObjectId("68996fc6c38dc47143d22f4d"); // thay ID thật
//   const senderId = new mongoose.Types.ObjectId("68996994725e35f6c4e85905"); // thay ID thật

//   const msgs = [];
//   for (let i = 1; i <= 50; i++) {
//     msgs.push({
//       conversationId,
//       senderId,
//       type: "text",
//       content: `Message number ${i} from seed`,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     });
//   }

//   await Message.insertMany(msgs);
//   console.log("✅ Seeded", msgs.length, "messages");
//   await mongoose.disconnect();
// }

// seedMessages().catch(console.error);
