const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
  {
    //     chatId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "Chat",
    //       required: true,
    //     },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "file", "voice", "system"],
      default: "text",
    },
    content: {
      type: String,
      trim: true,
    },
    //     mediaUrl: {
    //       type: String,
    //     },
    //     replyTo: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "Message",
    //     },
    //     forwarded: {
    //       type: Boolean,
    //       default: false,
    //     },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    // seenBy: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User",
    //   },
    // ],
    // deletedFor: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User",
    //   },
    // ],
    // reactions: [
    //   {
    //     userId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "User",
    //     },
    //     emoji: {
    //       type: String,
    //     },
    //   },
    // ],
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

module.exports = mongoose.model("Message", messageSchema);
