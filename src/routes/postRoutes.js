
const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE POST (authenticated users)
// POST /api/posts
router.post("/", protect, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      user: req.user._id,
    });

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL POSTS (public, paginated)
// GET /api/posts?page=1&limit=10
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find()
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Post.countDocuments(),
    ]);

    res.json({
      posts,
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

// GET POSTS BY USER USING ONE AGGREGATION PIPELINE
// GET /api/posts/user/:userId


router.get("/user/:userId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const result = await User.aggregate([
      {
        $match: { _id: userId },
      },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "user",
          pipeline: [
            {
              $sort: { createdAt: -1 },
            },
            {
              $facet: {
                posts: [
                  { $skip: skip },
                  { $limit: limit },
                ],
                metadata: [
                  { $count: "total" },
                ],
              },
            },
          ],
          as: "postData",
        },
      },
      {
        $unwind: "$postData",
      },
      {
        $project: {
          name: 1,
          posts: "$postData.posts",
          total: {
            $ifNull: [
              { $arrayElemAt: ["$postData.metadata.total", 0] },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          pagination: {
            total: "$total",
            page: { $literal: page },
            limit: { $literal: limit },
            totalPages: {
              $ceil: {
                $divide: ["$total", { $literal: limit }],
              },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          posts: 1,
          pagination: 1,
        },
      },
    ]);

    if (result.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("User posts aggregation failed:", error.message);
    res.status(500).json({
      message: "Server error",
    });
  }
});



module.exports = router;
