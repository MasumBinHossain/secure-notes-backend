
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const Note = require("../models/Note");
const Post = require("../models/Post");

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("\n========== USERS LIST ==========");

    const usersExplain = await User.collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(10)
      .explain("executionStats");

    console.dir(usersExplain, { depth: null });

    console.log("\n========== NOTES LIST ==========");

    const notesExplain = await Note.collection
      .find({ user: new mongoose.Types.ObjectId("6af61f548fc1daa9b1cd8979") })
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(10)
      .explain("executionStats");

    console.dir(notesExplain, { depth: null });

    console.log("\n========== POSTS LIST ==========");

    const postsExplain = await Post.collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(10)
      .explain("executionStats");

    console.dir(postsExplain, { depth: null });
    
    console.log("\n========== POSTS LOOKUP ==========");

    const lookupExplain = await User.aggregate([
    {
        $match: {
        _id: new mongoose.Types.ObjectId(
            "6af61f548fc1daa9b1cd8979"
        ),
        },
    },
    {
        $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "user",
        as: "posts",
        },
    },
    ]).explain("executionStats");

    console.dir(lookupExplain, { depth: null });


  } catch (error) {
    console.error("Index check failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkIndexes();
