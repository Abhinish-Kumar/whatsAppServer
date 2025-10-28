const express = require("express");
const authRoutes = express.Router();
const { registerUser, login } = require("./auth.controller");

authRoutes.post("/register", registerUser);
authRoutes.post("/login", login);

module.exports = authRoutes;
