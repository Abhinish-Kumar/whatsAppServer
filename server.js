const cluster = require("cluster");
const os = require("os");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const User = require("./models/UserSchema");
const Message = require("./models/MessageSchema");
const connectDB = require("./config/db");
const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 4400;
const JWT_SECRET = "abhinish";

// 🧠 Get number of CPU cores
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`👑 Master ${process.pid} is running`);
  console.log(`🧩 Forking ${numCPUs} workers...\n`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // When a worker dies, restart it automatically
  cluster.on("exit", (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // === Worker process starts ===
  connectDB();

  const server = http.createServer(app);

  const io = socketIo(server, {
    cors: {
      origin: "https://whatsapp-r6vb.onrender.com",
      credentials: true,
    },
  });

  // 🔒 Authenticate socket using JWT
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.token;
      if (!token) return next(new Error("Authentication failed: token missing"));
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err.message);
      next(new Error("Authentication error"));
    }
  });

  // 🌐 Handle socket connections
  io.on("connection", async (socket) => {
    console.log(`✅ Worker ${process.pid} → User connected: ${socket.user.id}`);

    socket.on("get_user", () => {
      socket.emit("user_info", socket.user);
    });

    await User.findByIdAndUpdate(
      socket.user.id,
      { socketID: socket.id, isActive: true, lastSeen: new Date() },
      { new: true }
    );

    const users = await User.find(
      {},
      { userName: 1, socketID: 1, isActive: 1, lastSeen: 1 }
    );
    io.emit("liveUsers", users);

    socket.on("send_message", async ({ receiverId, content, messageType }) => {
      try {
        const senderId = socket.user.id;

        const message = await Message.create({
          senderId,
          receiverId,
          content,
          messageType: messageType || "text",
          status: "sent",
        });

        io.to(socket.id).emit("message_sent", message);

        const receiver = await User.findById(receiverId);
        if (receiver?.socketID) {
          message.status = "delivered";
          await message.save();

          io.to(receiver.socketID).emit("receive_message", message);
          io.to(socket.id).emit("message_status_update", {
            messageId: message._id,
            status: "delivered",
          });
        }
      } catch (err) {
        console.error("❌ send_message error:", err.message);
        io.to(socket.id).emit("message_error", { error: err.message });
      }
    });

    socket.on("message_read", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        if (message.status !== "read") {
          message.status = "read";
          await message.save();

          const sender = await User.findById(message.senderId);
          if (sender?.socketID) {
            io.to(sender.socketID).emit("message_status_update", {
              messageId: message._id,
              status: "read",
            });
          }
        }
      } catch (err) {
        console.error("❌ message_read error:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`❌ Worker ${process.pid} → User disconnected: ${socket.id}`);
      await User.findByIdAndUpdate(socket.user.id, {
        socketID: "",
        isActive: false,
        lastSeen: new Date(),
      });

      const users = await User.find(
        {},
        { userName: 1, socketID: 1, isActive: 1, lastSeen: 1 }
      );
      io.emit("liveUsers", users);
    });

    socket.on("get_chat_messages", async ({ user1, user2 }) => {
      try {
        const chatMessages = await Message.find({
          $or: [
            { senderId: user1, receiverId: user2 },
            { senderId: user2, receiverId: user1 },
          ],
        }).sort({ createdAt: 1 });

        io.to(socket.id).emit("messages_updated", chatMessages);
      } catch (err) {
        console.error("❌ get_chat_messages error:", err.message);
      }
    });
  });

  server.listen(PORT, () =>
    console.log(`🚀 Worker ${process.pid} running on port ${PORT}`)
  );
}
