import express from "express";
import User from "../models/User.js";
import { calculateShowerGoals } from "../utils/showerAlgorithm.js";

const router = express.Router();

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
 * - displayName, heightFeet, heightInches, weightLbs, hairLength, hairType (questionnaire fields)
 * 
 * Automatically calculates and saves:
 * - idealTimeRange: { min, max } in seconds
 * - idealTemp: temperature in Celsius
 * 
 * NOTE: This endpoint saves to MongoDB. Use /calculate for preview without saving.
 */
router.post("/setup", async (req, res) => {
  try {
    const {
      walletAddress,
      displayName,
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

    // Add questionnaire fields (user inputs)
    if (displayName !== undefined) updateData.displayName = displayName;
    if (heightFeet !== undefined) updateData.heightFeet = Number(heightFeet);
    if (heightInches !== undefined) updateData.heightInches = Number(heightInches);
    if (weightLbs !== undefined) updateData.weightLbs = Number(weightLbs);
    if (hairLength !== undefined) updateData.hairLength = hairLength;
    if (hairType !== undefined) updateData.hairType = hairType;

    // Add calculated goals (from algorithm)
    updateData.idealTimeRange = calculatedGoals.idealTimeRange;
    updateData.idealTemp = calculatedGoals.idealTemp;

    // Use findOneAndUpdate with upsert to create or update
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
 * GET /:walletAddress
 * Retrieves a user profile by wallet address
 * Returns { success: true, exists: true/false, user?: {...} }
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

