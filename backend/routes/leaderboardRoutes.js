import express from "express";
import {
  getPodiumDataByScore,
  getTopUsersByScore,
  getUserScore,
} from "../utils/leaderboardScores.js";

const router = express.Router();

/**
 * GET /leaderboard/podium
 * Returns top 3 users by total points (score)
 * Includes display names and profile photos from MongoDB
 */
router.get("/podium", async (req, res) => {
  try {
    // Fetch podium data based on scores from MongoDB
    const podiumData = await getPodiumDataByScore();

    res.json({
      success: true,
      data: podiumData,
    });
  } catch (error) {
    console.error("Error in GET /leaderboard/podium:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * GET /leaderboard/top
 * Returns top N users by total points (score)
 * Query params: limit (default: 10)
 */
router.get("/top", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get top users by score from MongoDB
    const topUsers = await getTopUsersByScore(limit);

    // Format for frontend (use name or truncated wallet address)
    const leaderboardData = topUsers.map((user) => ({
      rank: user.rank,
      wallet: user.wallet,
      score: user.score,
      name: user.name || user.wallet.slice(0, 4) + "..." + user.wallet.slice(-4),
      profilePhoto: user.profilePhoto || null,
      totalShowers: user.totalShowers || 0,
    }));

    res.json({
      success: true,
      data: leaderboardData,
    });
  } catch (error) {
    console.error("Error in GET /leaderboard/top:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * GET /leaderboard/score/:walletAddress
 * Returns score (total points) for a specific wallet
 */
router.get("/score/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const userScore = await getUserScore(walletAddress);

    if (!userScore) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      wallet: userScore.wallet,
      score: userScore.score,
      totalShowers: userScore.totalShowers,
    });
  } catch (error) {
    console.error("Error in GET /leaderboard/score:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;

