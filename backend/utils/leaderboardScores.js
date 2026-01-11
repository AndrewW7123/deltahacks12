/**
 * Leaderboard Utilities - MongoDB Score-Based
 * 
 * This module provides functions to fetch leaderboard data based on user scores (points)
 * from MongoDB instead of Solana token balances.
 */

import User from "../models/User.js";

/**
 * Gets the top N users by total points
 * @param {number} topN - Number of top users to return (default: 10)
 * @returns {Promise<Array<{wallet: string, score: number, rank: number, name?: string, profilePhoto?: string}>>}
 */
export async function getTopUsersByScore(topN = 10) {
  try {
    // Find users with totalPoints > 0, sorted by totalPoints descending
    const topUsers = await User.find({ totalPoints: { $gt: 0 } })
      .select("walletAddress displayName profilePhoto totalPoints totalShowers")
      .sort({ totalPoints: -1 }) // Sort by totalPoints descending
      .limit(topN)
      .lean(); // Use lean() for better performance (returns plain JS objects)

    // Map to leaderboard format
    return topUsers.map((user, index) => ({
      wallet: user.walletAddress,
      score: user.totalPoints || 0,
      rank: index + 1,
      name: user.displayName || null,
      profilePhoto: user.profilePhoto || null,
      totalShowers: user.totalShowers || 0,
    }));
  } catch (error) {
    console.error("Error in getTopUsersByScore:", error);
    throw error;
  }
}

/**
 * Gets leaderboard data formatted for the Podium component (top 3)
 * @returns {Promise<Array<{place: 1|2|3, name: string, wallet: string, score: number, avatar?: string}>>}
 */
export async function getPodiumDataByScore() {
  try {
    const topUsers = await getTopUsersByScore(3);

    // Format for Podium component (top 3 only)
    return topUsers.slice(0, 3).map((entry, index) => ({
      place: (index + 1), // 1, 2, or 3
      name: entry.name || entry.wallet.slice(0, 4) + "..." + entry.wallet.slice(-4),
      wallet: entry.wallet,
      score: entry.score,
      avatar: entry.profilePhoto || null,
    }));
  } catch (error) {
    console.error("Error in getPodiumDataByScore:", error);
    throw error;
  }
}

/**
 * Gets a user's score by wallet address
 * @param {string} walletAddress - The wallet address
 * @returns {Promise<{wallet: string, score: number, totalShowers: number} | null>}
 */
export async function getUserScore(walletAddress) {
  try {
    const normalizedWallet = walletAddress.toLowerCase().trim();
    const user = await User.findOne({ walletAddress: normalizedWallet })
      .select("walletAddress totalPoints totalShowers")
      .lean();

    if (!user) {
      return null;
    }

    return {
      wallet: user.walletAddress,
      score: user.totalPoints || 0,
      totalShowers: user.totalShowers || 0,
    };
  } catch (error) {
    console.error("Error in getUserScore:", error);
    throw error;
  }
}

