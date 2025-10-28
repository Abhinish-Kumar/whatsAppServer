const app = require("./app");
const http = require("http");
const connectDB = require("./config/db");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const User = require("./models/UserSchema");
const Message = require("./models/MessageSchema");
require("dotenv").config();
const PORT = process.env.PORT || 4400;

const JWT_SECRET = "abhinish";

// Connect to MongoDB
connectDB();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
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
  console.log(`✅ User connected: ${socket.user.id}`);

  // Send logged-in user info
  socket.on("get_user", () => {
    socket.emit("user_info", socket.user);
  });

  // Update user's socketID and online status
  await User.findByIdAndUpdate(
    socket.user.id,
    { socketID: socket.id, isActive: true, lastSeen: new Date() },
    { new: true }
  );

  // Broadcast all online users
  const users = await User.find(
    {},
    { userName: 1, socketID: 1, isActive: 1, lastSeen: 1 }
  );
  io.emit("liveUsers", users);

  // 📩 Send message
  socket.on("send_message", async ({ receiverId, content, messageType }) => {
    try {
      const senderId = socket.user.id;

      // 1️⃣ Save message as "sent"
      const message = await Message.create({
        senderId,
        receiverId,
        content,
        messageType: messageType || "text",
        status: "sent", // initial state
      });

      // 2️⃣ Notify sender that message is "sent"
      io.to(socket.id).emit("message_sent", message);

      // 3️⃣ Check if receiver is online
      const receiver = await User.findById(receiverId);
      if (receiver?.socketID) {
        // Update status to "delivered"
        message.status = "delivered";
        await message.save();

        // Notify receiver
        io.to(receiver.socketID).emit("receive_message", message);

        // Update sender about delivery
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

  // 👁️ Mark message as read
  socket.on("message_read", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      // Update status to "read" only if it is not already read
      if (message.status !== "read") {
        message.status = "read";
        await message.save();

        // Notify the sender about "read" status
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

  // 📴 Handle disconnect
  socket.on("disconnect", async () => {
    console.log(`❌ User disconnected: ${socket.id}`);

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

  // 📤 Fetch chat messages for selected users
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
  console.log("🚀 Server running on http://localhost:4400")
);
