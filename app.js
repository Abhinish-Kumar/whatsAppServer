const express = require("express");
const app = express();
const cors = require("cors");
const authRoutes = require("./Routes/auth/auth.routes");
const cookieParser = require("cookie-parser");

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(authRoutes);

module.exports = app;
