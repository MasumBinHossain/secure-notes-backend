
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    
    interests: {
      type: [String],
      default: [],
      set: (values) => {
        if (!Array.isArray(values)) return [];

        const normalized = values
          .filter((value) => typeof value === "string")
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean);

        return [...new Set(normalized)];
      },
    },

  },
  {
    timestamps: true,
  }
);

// Explicit index definitions
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ interests: 1 });

module.exports = mongoose.model("User", userSchema);
