import express from "express";
import multer from "multer";
import User from "../models/User.js";
import { calculateShowerGoals } from "../utils/showerAlgorithm.js";
import { bufferToBase64, validateImageFile } from "../utils/imageUpload.js";

const router = express.Router();

// Configure multer for in-memory storage (we'll convert to base64)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * POST /calculate
 * Calculates optimal shower goals based on questionnaire data
 * Does NOT save to MongoDB - used for preview before wallet integration
 * 
 * Accepts JSON body with:
 * - heightFeet, heightInches, weightLbs, hairLength, hairType (questionnaire fields)
 * 
 * Returns calculated goals:
 * - idealTimeRange: { min, max } in seconds
 * - idealTemp: temperature in Celsius
 */
router.post("/calculate", async (req, res) => {
  try {
    const {
      heightFeet,
      heightInches,
      weightLbs,
      hairLength,
      hairType,
    } = req.body;

    // Prepare profile data for calculation
    const profileData = {
      heightFeet: heightFeet !== undefined ? Number(heightFeet) : 0,
      heightInches: heightInches !== undefined ? Number(heightInches) : 0,
      weightLbs: weightLbs !== undefined ? Number(weightLbs) : 0,
      hairLength: hairLength,
      hairType: hairType,
    };

    // Calculate optimal shower goals using the algorithm
    const calculatedGoals = calculateShowerGoals(profileData);

    res.status(200).json({
      success: true,
      goals: calculatedGoals,
      profileData: profileData, // Return the input data for reference
    });
  } catch (error) {
    console.error("Error in POST /calculate:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * POST /setup
 * Creates or updates a user profile based on wallet address
 * Receives questionnaire data, calculates optimal shower goals, and saves to MongoDB
 * 
 * Accepts JSON body with:
 * - walletAddress (required)
 * - displayName, profilePhoto (profile fields)
 * - heightFeet, heightInches, weightLbs, hairLength, hairType (questionnaire fields)
 * 
 * Automatically calculates and saves:
 * - idealTimeRange: { min, max } in seconds
 * - idealTemp: temperature in Celsius
 * 
 * NOTE: This endpoint saves to MongoDB. Use /calculate for preview without saving.
 * NOTE: profilePhoto should be a URL string pointing to the image (e.g., from an image hosting service)
 */
router.post("/setup", async (req, res) => {
  try {
    // Log incoming request
    console.log("📥 POST /api/profile/setup - Incoming calibration data:", {
      walletAddress: req.body.walletAddress,
      displayName: req.body.displayName,
      hasProfilePhoto: !!req.body.profilePhoto,
      heightFeet: req.body.heightFeet,
      heightInches: req.body.heightInches,
      weightLbs: req.body.weightLbs,
      hairLength: req.body.hairLength,
      hairType: req.body.hairType,
    });

    const {
      walletAddress,
      displayName,
      profilePhoto,
      heightFeet,
      heightInches,
      weightLbs,
      hairLength,
      hairType,
    } = req.body;

    // Validate required field
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "walletAddress is required",
      });
    }

    // Normalize wallet address (lowercase for consistency)
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    // Prepare profile data for calculation
    const profileData = {
      heightFeet: heightFeet !== undefined ? Number(heightFeet) : 0,
      heightInches: heightInches !== undefined ? Number(heightInches) : 0,
      weightLbs: weightLbs !== undefined ? Number(weightLbs) : 0,
      hairLength: hairLength,
      hairType: hairType,
    };

    // Calculate optimal shower goals using the algorithm
    const calculatedGoals = calculateShowerGoals(profileData);

    // Prepare update data with both questionnaire inputs and calculated results
    const updateData = {
      walletAddress: normalizedWalletAddress,
    };

    // Add profile fields (user inputs)
    if (displayName !== undefined) updateData.displayName = displayName;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto; // URL to profile photo
    
    // Add questionnaire fields (user inputs)
    if (heightFeet !== undefined) updateData.heightFeet = Number(heightFeet);
    if (heightInches !== undefined) updateData.heightInches = Number(heightInches);
    if (weightLbs !== undefined) updateData.weightLbs = Number(weightLbs);
    if (hairLength !== undefined) updateData.hairLength = hairLength;
    if (hairType !== undefined) updateData.hairType = hairType;

    // Add calculated goals (from algorithm)
    updateData.idealTimeRange = calculatedGoals.idealTimeRange;
    updateData.idealTemp = calculatedGoals.idealTemp;

    // Use findOneAndUpdate with upsert to create or update
    console.log("💾 Saving user to MongoDB with data:", {
      walletAddress: normalizedWalletAddress,
      hasDisplayName: !!updateData.displayName,
      hasIdealTimeRange: !!updateData.idealTimeRange,
      hasIdealTemp: !!updateData.idealTemp,
    });

    const user = await User.findOneAndUpdate(
      { walletAddress: normalizedWalletAddress },
      updateData,
      {
        upsert: true, // Create if doesn't exist, update if it does
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
        setDefaultsOnInsert: true, // Apply defaults when creating new document
      }
    );

    console.log("✅ User saved successfully:", {
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      _id: user._id,
    });

    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error in POST /setup:", error);

    // Handle duplicate key error (walletAddress unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A user with this wallet address already exists",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * POST /upload-photo/:walletAddress
 * Handles image file upload and stores as base64 in MongoDB
 * Accepts multipart/form-data with 'photo' field
 */
router.post("/upload-photo/:walletAddress", upload.single("photo"), async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const file = req.file;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    // Find user first to ensure they exist
    const existingUser = await User.findOne({ walletAddress: normalizedWalletAddress });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Convert file buffer to base64 data URL
    const base64Image = bufferToBase64(file.buffer, file.mimetype);

    // Update user's profile photo
    const user = await User.findOneAndUpdate(
      { walletAddress: normalizedWalletAddress },
      { profilePhoto: base64Image },
      {
        new: true,
        runValidators: true,
      }
    );

    console.log("✅ Profile photo uploaded:", {
      walletAddress: user.walletAddress,
      imageSize: file.size,
      mimeType: file.mimetype,
    });

    res.status(200).json({
      success: true,
      user: user,
      message: "Profile photo uploaded successfully",
    });
  } catch (error) {
    console.error("Error in POST /upload-photo:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * PUT /update/:walletAddress
 * Updates user profile data (displayName, heightFeet, heightInches, weightLbs, hairLength, hairType)
 * Does NOT recalculate idealTimeRange/idealTemp - use /setup for that
 * NOTE: profilePhoto should be updated via POST /upload-photo endpoint
 * 
 * Accepts JSON body with any of the following fields:
 * - displayName (profile fields)
 * - heightFeet, heightInches, weightLbs, hairLength, hairType (questionnaire fields)
 * 
 * Returns the updated user object
 */
router.put("/update/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const {
      displayName,
      heightFeet,
      heightInches,
      weightLbs,
      hairLength,
      hairType,
    } = req.body;

    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    // Find user first to ensure they exist
    const existingUser = await User.findOne({ walletAddress: normalizedWalletAddress });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};

    if (displayName !== undefined) updateData.displayName = displayName;
    if (heightFeet !== undefined) updateData.heightFeet = Number(heightFeet);
    if (heightInches !== undefined) updateData.heightInches = Number(heightInches);
    if (weightLbs !== undefined) updateData.weightLbs = Number(weightLbs);
    if (hairLength !== undefined) updateData.hairLength = hairLength;
    if (hairType !== undefined) updateData.hairType = hairType;

    // Update user
    const user = await User.findOneAndUpdate(
      { walletAddress: normalizedWalletAddress },
      updateData,
      {
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
      }
    );

    console.log("✅ User profile updated:", {
      walletAddress: user.walletAddress,
      displayName: user.displayName,
    });

    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error in PUT /update:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * GET /weekly-schedule/:walletAddress
 * Retrieves weekly shower schedule data and generates a graph description using Gemini
 * Returns { success: true, graph: string } or { success: false, error: string }
 */
router.get("/weekly-schedule/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "walletAddress is required",
      });
    }

    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ walletAddress: normalizedWalletAddress }).select(
      "walletAddress dailyScores"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Get the last 7 days of data
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filter dailyScores for the last 7 days
    const weeklyData = user.dailyScores
      .filter((score) => {
        const scoreDate = new Date(score.date);
        scoreDate.setUTCHours(0, 0, 0, 0);
        return scoreDate >= sevenDaysAgo && scoreDate <= today;
      })
      .map((score) => ({
        date: score.date,
        showerCount: score.showerCount || 0,
        totalPoints: score.totalPoints || 0,
        showers: score.showers || [],
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Import and use Gemini graph generator
    const { generateWeeklyScheduleGraph } = await import("../utils/geminiGraphGenerator.js");
    const graphDescription = await generateWeeklyScheduleGraph(weeklyData);

    res.status(200).json({
      success: true,
      graph: graphDescription,
    });
  } catch (error) {
    console.error("Error in GET /weekly-schedule:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * GET /:walletAddress
 * Retrieves a user profile by wallet address
 * Returns { success: true, exists: true/false, user?: {...} }
 * NOTE: This catch-all route must come AFTER all specific routes
 */
router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "walletAddress is required",
      });
    }

    // Normalize wallet address (lowercase for consistency)
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    // Find user by wallet address
    const user = await User.findOne({ walletAddress: normalizedWalletAddress });

    if (user) {
      return res.status(200).json({
        success: true,
        exists: true,
        user: user,
      });
    } else {
      // User not found - return exists: false (not an error)
      return res.status(200).json({
        success: true,
        exists: false,
      });
    }
  } catch (error) {
    console.error("Error in GET /:walletAddress:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;
