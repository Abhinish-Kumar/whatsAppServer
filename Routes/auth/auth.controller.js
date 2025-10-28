const User = require("../../models/UserSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Secret key for JWT
const JWTsecretKey = "abhinish"; // in production, use process.env.JWT_SECRET

// REGISTER
async function registerUser(req, res) {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      userName,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
}

// LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid user email",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, userName: user.userName, email: user.email },
      JWTsecretKey,
      { expiresIn: "1d" } // token valid for 1 day
    );

    // Send JWT in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // true in production (https)
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token, // optionally send it in response too
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
}

// // GET /api/messages/:userId
// app.get("/api/messages/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const currentUserId = req.user.id; // extract from JWT if needed

//     const messages = await Message.find({
//       $or: [
//         { senderId: currentUserId, receiverId: userId },
//         { senderId: userId, receiverId: currentUserId },
//       ],
//     }).sort({ createdAt: 1 });

//     res.json(messages);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = { registerUser, login };
