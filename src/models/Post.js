
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    content: {
      type: String,
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Supports user-specific post retrieval and newest-first sorting
postSchema.index({ user: 1, createdAt: -1 });

// Supports public posts listing by newest first
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
