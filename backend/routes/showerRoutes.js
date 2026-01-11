import express from "express";
import User from "../models/User.js";
import { calculateShowerMetrics } from "../utils/pointsCalculator.js";

const router = express.Router();

/**
 * POST /shower/complete
 * Records a completed shower and calculates points/coins
 * Updates MongoDB immediately
 * 
 * Request body:
 * {
 *   walletAddress: string (required)
 *   actualTime: number (seconds, required)
 *   actualTemp: number (Celsius, required)
 * }
 */
router.post("/complete", async (req, res) => {
  try {
    const { walletAddress, actualTime, actualTemp } = req.body;

    // Validate input
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "walletAddress is required",
      });
    }

    if (typeof actualTime !== "number" || actualTime <= 0) {
      return res.status(400).json({
        success: false,
        error: "actualTime must be a positive number (seconds)",
      });
    }

    if (typeof actualTemp !== "number" || actualTemp <= 0) {
      return res.status(400).json({
        success: false,
        error: "actualTemp must be a positive number (Celsius)",
      });
    }

    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ walletAddress: normalizedWalletAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found. Please complete profile setup first.",
      });
    }

    if (!user.idealTimeRange || !user.idealTemp) {
      return res.status(400).json({
        success: false,
        error: "User profile incomplete. Ideal time range and temperature not set.",
      });
    }

    // Calculate metrics
    const metrics = calculateShowerMetrics(
      actualTime,
      actualTemp,
      user.idealTimeRange,
      user.idealTemp
    );

    // Get today's date (start of day in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find or create today's score entry
    let dailyScore = user.dailyScores.find((score) => {
      const scoreDate = new Date(score.date);
      scoreDate.setUTCHours(0, 0, 0, 0);
      return scoreDate.getTime() === today.getTime();
    });

    if (!dailyScore) {
      // Create new daily score entry
      dailyScore = {
        date: today,
        totalPoints: 0,
        showerCount: 0,
        cleanEnvCoins: 0,
        soapTokenCoins: 0,
        showers: [],
      };
      user.dailyScores.push(dailyScore);
      dailyScore = user.dailyScores[user.dailyScores.length - 1]; // Get the actual object
    }

    // Add this shower to today's record
    dailyScore.showers.push({
      time: actualTime,
      temperature: actualTemp,
      points: metrics.points,
      cleanEnvCoins: metrics.cleanEnvCoins,
      soapTokenCoins: metrics.soapTokenCoins,
      timestamp: new Date(),
    });

    // Update daily totals
    dailyScore.totalPoints += metrics.points;
    dailyScore.showerCount += 1;
    dailyScore.cleanEnvCoins += metrics.cleanEnvCoins;
    dailyScore.soapTokenCoins += metrics.soapTokenCoins;

    // Update lifetime totals
    user.totalPoints = (user.totalPoints || 0) + metrics.points;
    user.totalShowers = (user.totalShowers || 0) + 1;
    user.totalCleanEnvCoins = (user.totalCleanEnvCoins || 0) + metrics.cleanEnvCoins;
    user.totalSoapTokenCoins = (user.totalSoapTokenCoins || 0) + metrics.soapTokenCoins;

    // Save to MongoDB
    await user.save();

    res.json({
      success: true,
      data: {
        points: metrics.points,
        cleanEnvCoins: metrics.cleanEnvCoins,
        soapTokenCoins: metrics.soapTokenCoins,
        dailyTotal: {
          points: dailyScore.totalPoints,
          showers: dailyScore.showerCount,
          cleanEnvCoins: dailyScore.cleanEnvCoins,
          soapTokenCoins: dailyScore.soapTokenCoins,
        },
        lifetimeTotal: {
          points: user.totalPoints,
          showers: user.totalShowers,
          cleanEnvCoins: user.totalCleanEnvCoins,
          soapTokenCoins: user.totalSoapTokenCoins,
        },
      },
      message: "Shower recorded successfully. Coins will be minted to Solana tonight.",
    });
  } catch (error) {
    console.error("Error in POST /shower/complete:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * GET /shower/daily/:walletAddress
 * Get today's shower data for a user
 */
router.get("/daily/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const normalizedWalletAddress = walletAddress.toLowerCase().trim();

    const user = await User.findOne({ walletAddress: normalizedWalletAddress }).select(
      "walletAddress dailyScores totalPoints totalShowers totalCleanEnvCoins totalSoapTokenCoins"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Get today's date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find today's score
    const todayScore = user.dailyScores.find((score) => {
      const scoreDate = new Date(score.date);
      scoreDate.setUTCHours(0, 0, 0, 0);
      return scoreDate.getTime() === today.getTime();
    });

    res.json({
      success: true,
      data: {
        today: todayScore || {
          date: today,
          totalPoints: 0,
          showerCount: 0,
          cleanEnvCoins: 0,
          soapTokenCoins: 0,
          showers: [],
        },
        lifetime: {
          points: user.totalPoints || 0,
          showers: user.totalShowers || 0,
          cleanEnvCoins: user.totalCleanEnvCoins || 0,
          soapTokenCoins: user.totalSoapTokenCoins || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /shower/daily:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;

