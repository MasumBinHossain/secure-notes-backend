
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const adminRoutes = require("./routes/adminRoutes");
const postRoutes = require("./routes/postRoutes");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/posts", postRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Secure Notes API is running!"
    });
});

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully!");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    
    } catch (error) {
        console.error("MongoDB connection failed!");

        console.error("Main error:", error.message);

        if (error.reason?.servers) {
            for (const [address, server] of error.reason.servers) {
                console.log("\n----------------------");
                console.log("Server:", address);
                console.log("Server status:", server.type);
                console.log("Underlying error:", server.error?.message);
                console.log("Error name:", server.error?.name);
            }
        }

        process.exit(1);
    }

};

startServer();
