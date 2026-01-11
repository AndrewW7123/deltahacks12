import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import profileRoutes from "./routes/profileRoutes.js";

// ES module way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from multiple possible locations
// Try: backend/.env first, then root .env
const envPaths = [
  path.resolve(__dirname, ".env"), // backend/.env
  path.resolve(__dirname, "../.env"), // root .env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`✅ Loaded environment variables from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.warn("⚠️  No .env file found. Using environment variables from system or defaults.");
  console.warn(`   Searched in: ${envPaths.join(", ")}`);
  console.warn("   Create a .env file in the root or backend directory with required variables.");
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// CORS middleware (allow frontend to make requests)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // In production, replace * with your frontend URL
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is not set");
  console.error("   Please add MONGO_URI to your .env file");
  console.error("   Example: MONGO_URI=mongodb://localhost:27017/shower-app");
  console.error("\n   You can still run the server, but MongoDB-dependent routes will fail.");
  console.warn("\n⚠️  Starting server without MongoDB connection...");
} else {
  // Only connect to MongoDB if URI is provided

  mongoose
    .connect(MONGO_URI, {
      // Mongoose 8+ connection options
    })
    .then(() => {
      console.log("✅ Connected to MongoDB successfully");
      console.log(`   Database: ${MONGO_URI.split("@").pop() || MONGO_URI.split("/").pop()}`);
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error.message);
      console.error("   Server will continue running, but database operations will fail.");
      console.error("   Make sure MongoDB is running and the connection string is correct.");
    });

  // MongoDB connection event handlers
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("❌ MongoDB error:", error.message);
  });
}

// Routes
app.use("/api/profile", profileRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Profile API: http://localhost:${PORT}/api/profile`);
});

