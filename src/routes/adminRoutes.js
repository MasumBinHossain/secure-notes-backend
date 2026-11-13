
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Note = require("../models/Note");
const Post = require("../models/Post");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

//console.log("ADMIN ROUTES LOADED");

// Every admin endpoint requires authentication and admin role
router.use(protect, adminOnly);


// GROUP USERS BY INTERESTS
// GET /api/admin/users/grouped-by-interests


router.get("/users/grouped-by-interests", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const result = await User.aggregate([
      // Stage 1: Use the interests multikey index to find
      // users having at least one non-empty string interest.
      {
        $match: {
          interests: { $gt: "" },
        },
      },

      // Stage 2: Convert each interest array into individual entries.
      {
        $unwind: "$interests",
      },

      // Stage 3: Normalize each interest.
      {
        $set: {
          normalizedInterest: {
            $toLower: {
              $trim: {
                input: "$interests",
              },
            },
          },
        },
      },

      // Stage 4: Remove empty or whitespace-only interests.
      {
        $match: {
          normalizedInterest: { $ne: "" },
        },
      },

      // Stage 5: Group users by normalized interest.
      {
        $group: {
          _id: "$normalizedInterest",
          users: {
            $addToSet: {
              id: "$_id",
              name: "$name",
              email: "$email",
            },
          },
        },
      },

      // Stage 6: Count unique users in each group.
      {
        $set: {
          totalUsers: { $size: "$users" },
        },
      },

      // Stage 7: Sort groups alphabetically.
      {
        $sort: { _id: 1 },
      },

      // Stage 8: Paginate groups and calculate total group count.
      {
        $facet: {
          groups: [
            { $skip: skip },
            { $limit: limit },
          ],
          metadata: [
            { $count: "total" },
          ],
        },
      },
    ]);

    const groups = result[0]?.groups || [];
    const total = result[0]?.metadata?.[0]?.total || 0;

    res.json({
      message: "Users grouped by interests",
      groups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Interest aggregation failed:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
});




// GET ALL USERS (PAGINATED)
// GET /api/admin/users?page=1&limit=10
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE USER
// POST /api/admin/users
router.post("/users", async (req, res) => {
  try {
    const { name, email, password, role, interests } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: role || "user",
      interests: Array.isArray(interests) ? interests : [],
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        interests: user.interests,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// GET SINGLE USER PROFILE
// GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({ user });
  } catch (error) {
    console.error("Fetch user profile failed:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE USER
// PUT /api/admin/users/:id
router.put("/users/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const { name, email, role, interests, password } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Invalid name" });
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Invalid email" });
      }
      updates.email = email.trim().toLowerCase();
    }

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updates.role = role;
    }

    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({ message: "Interests must be an array" });
      }
      updates.interests = interests;
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }
      updates.password = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE USER
// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own admin account",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Also delete the notes and posts owned by this user
    await Note.deleteMany({ user: user._id });
    await Post.deleteMany({ user: user._id });

    res.json({
      message: "User, their notes, and their posts deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL NOTES (PAGINATED)
// GET /api/admin/notes?page=1&limit=10
router.get("/notes", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      Note.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(),
    ]);

    res.json({
      notes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
