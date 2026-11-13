
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
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

// Supports efficient retrieval and pagination of a user's notes
noteSchema.index({ user: 1, createdAt: -1 });

// Supports admin retrieval and pagination of all notes
noteSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);
