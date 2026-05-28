const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash the password — never store plain text
    // 10 = number of salt rounds. Higher = more secure but slower.
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ email, passwordHash });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        lastCheckedAt: user.lastCheckedAt,
      },
    });
  } catch (err) {
    console.error("[POST /auth/register]", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists — always say "invalid credentials"
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        lastCheckedAt: user.lastCheckedAt,
      },
    });
  } catch (err) {
    console.error("[POST /auth/login]", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ── PATCH /auth/me/lastCheckedAt ──────────────────────────────────────────────
// Called after jobs are fetched on dashboard load.
// Updates the timestamp used to calculate "X new jobs since your last visit".
// IMPORTANT: the frontend calls fetchJobs FIRST, then this — order matters.
router.patch("/me/lastCheckedAt", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { lastCheckedAt: new Date() },
      { new: true },
    ).select("-passwordHash");

    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
