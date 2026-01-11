import express from "express";
import User from "../models/User.js";
import { calculateShowerMetrics } from "../utils/pointsCalculator.js";
import { mintRewardsImmediately } from "../utils/solanaMintService.js";

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
 * POST /shower/hardware-input
 * Unified route for hardware input that updates both MongoDB and Solana blockchain immediately
 * This ensures points and token balances stay in sync
 * 
 * Request body:
 * {
 *   walletAddress: string (required)
 *   actualTime: number (seconds, required)
 *   actualTemp: number (Celsius, required)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   data: {
 *     points, cleanEnvCoins, soapTokenCoins,
 *     blockchainSync: { status, soapTokenTx, cleanEnvTx }
 *   }
 * }
 */
router.post("/hardware-input", async (req, res) => {
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

    // Step 1: Calculate metrics
    const metrics = calculateShowerMetrics(
      actualTime,
      actualTemp,
      user.idealTimeRange,
      user.idealTemp
    );

    // Step 2: Update MongoDB immediately
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find or create today's score entry
    let dailyScore = user.dailyScores.find((score) => {
      const scoreDate = new Date(score.date);
      scoreDate.setUTCHours(0, 0, 0, 0);
      return scoreDate.getTime() === today.getTime();
    });

    if (!dailyScore) {
      dailyScore = {
        date: today,
        totalPoints: 0,
        showerCount: 0,
        cleanEnvCoins: 0,
        soapTokenCoins: 0,
        showers: [],
      };
      user.dailyScores.push(dailyScore);
      dailyScore = user.dailyScores[user.dailyScores.length - 1];
    }

    // Create shower record with blockchain sync tracking
    const showerRecord = {
      time: actualTime,
      temperature: actualTemp,
      points: metrics.points,
      cleanEnvCoins: metrics.cleanEnvCoins,
      soapTokenCoins: metrics.soapTokenCoins,
      timestamp: new Date(),
      blockchainSync: {
        status: "pending",
        soapTokenTx: null,
        cleanEnvTx: null,
        syncedAt: null,
        error: null,
      },
    };

    // Add shower to today's record
    dailyScore.showers.push(showerRecord);
    const showerIndex = dailyScore.showers.length - 1;

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

    // Save to MongoDB first (before blockchain)
    await user.save();

    // Step 3: Mint tokens to Solana blockchain immediately
    let blockchainResult = {
      success: false,
      soapTokenTx: null,
      cleanEnvTx: null,
      error: null,
    };

    try {
      blockchainResult = await mintRewardsImmediately(
        normalizedWalletAddress,
        metrics.soapTokenCoins,
        metrics.cleanEnvCoins
      );

      if (blockchainResult.success) {
        // Update shower record with transaction signatures
        dailyScore.showers[showerIndex].blockchainSync = {
          status: "synced",
          soapTokenTx: blockchainResult.soapTokenTx,
          cleanEnvTx: blockchainResult.cleanEnvTx,
          syncedAt: new Date(),
          error: null,
        };

        console.log(`✅ Blockchain sync successful for ${normalizedWalletAddress.slice(0, 6)}...${normalizedWalletAddress.slice(-4)}`);
      } else {
        // Blockchain failed - mark for manual sync but don't rollback MongoDB
        dailyScore.showers[showerIndex].blockchainSync = {
          status: "manual_sync_required",
          soapTokenTx: null,
          cleanEnvTx: null,
          syncedAt: null,
          error: blockchainResult.error || "Blockchain sync failed",
        };

        console.warn(`⚠️  Blockchain sync failed for ${normalizedWalletAddress.slice(0, 6)}...${normalizedWalletAddress.slice(-4)}: ${blockchainResult.error}`);
        console.warn(`   MongoDB points saved. Manual sync required.`);
      }
    } catch (error) {
      // Blockchain error - mark for manual sync but don't rollback MongoDB
      dailyScore.showers[showerIndex].blockchainSync = {
        status: "manual_sync_required",
        soapTokenTx: null,
        cleanEnvTx: null,
        syncedAt: null,
        error: error.message || "Blockchain sync error",
      };

      console.error(`❌ Blockchain sync error for ${normalizedWalletAddress.slice(0, 6)}...${normalizedWalletAddress.slice(-4)}:`, error);
      console.error(`   MongoDB points saved. Manual sync required.`);
    }

    // Save updated blockchain sync status to MongoDB
    await user.save();

    // Step 4: Return response
    res.json({
      success: true,
      data: {
        points: metrics.points,
        cleanEnvCoins: metrics.cleanEnvCoins,
        soapTokenCoins: metrics.soapTokenCoins,
        blockchainSync: dailyScore.showers[showerIndex].blockchainSync,
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
      message: blockchainResult.success
        ? "Shower recorded and tokens minted to Solana successfully!"
        : "Shower recorded. Blockchain sync pending - will retry automatically.",
    });
  } catch (error) {
    console.error("❌ Error in POST /shower/hardware-input:", error);
    console.error("   Stack:", error.stack);
    console.error("   Request body:", req.body);
    
    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV !== "production";
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
      ...(isDevelopment && { stack: error.stack }),
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

