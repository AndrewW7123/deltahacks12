/**
 * Solana Leaderboard Utilities
 * 
 * This module provides functions to fetch leaderboard data directly from Solana.
 * Currently uses token balances as the ranking metric.
 * 
 * Future: This can be migrated to a dedicated Solana Program for more complex
 * leaderboard logic (streaks, multiple metrics, etc.)
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Reuse a single connection instance
let connectionInstance = null;

function getConnection() {
  if (!connectionInstance) {
    connectionInstance = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return connectionInstance;
}

/**
 * Wait/delay utility for rate limiting
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches token balance for a specific wallet address
 * @param {string} walletAddress - The wallet public key address
 * @param {string} mintAddress - The token mint address
 * @param {Connection} connection - Optional connection instance to reuse
 * @returns {Promise<number>} - Token balance (in token units, not raw)
 */
export async function getTokenBalance(walletAddress, mintAddress, connection = null) {
  try {
    const conn = connection || getConnection();
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(mintAddress);

    // Get the associated token account address (this is just a calculation, no RPC call)
    const tokenAccountAddress = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey,
      false, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID
    );

    try {
      // Get token account info (this is the RPC call)
      const tokenAccount = await getAccount(conn, tokenAccountAddress, "confirmed");
      
      // Return balance (in token units - assuming 0 decimals for SoapToken/ICE)
      return Number(tokenAccount.amount);
    } catch (error) {
      // Account doesn't exist or has no balance
      if (error.message?.includes("could not find account")) {
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error fetching balance for ${walletAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetches token balances for multiple wallet addresses with rate limiting
 * Processes in batches to avoid hitting RPC rate limits
 * @param {string[]} walletAddresses - Array of wallet public key addresses
 * @param {string} mintAddress - The token mint address (e.g., SoapToken)
 * @param {number} batchSize - Number of requests per batch (default: 5)
 * @param {number} delayMs - Delay between batches in milliseconds (default: 100)
 * @returns {Promise<Array<{wallet: string, balance: number}>>}
 */
export async function getTokenBalances(walletAddresses, mintAddress, batchSize = 5, delayMs = 100) {
  const connection = getConnection(); // Reuse single connection
  const balances = [];

  // Process in batches to avoid rate limiting
  for (let i = 0; i < walletAddresses.length; i += batchSize) {
    const batch = walletAddresses.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (wallet) => {
        const balance = await getTokenBalance(wallet, mintAddress, connection);
        return { wallet, balance };
      })
    );

    balances.push(...batchResults);

    // Add delay between batches to avoid rate limiting (except for the last batch)
    if (i + batchSize < walletAddresses.length) {
      await delay(delayMs);
    }
  }

  return balances;
}

/**
 * Gets the top N wallets by token balance
 * @param {string[]} walletAddresses - Array of wallet addresses to check
 * @param {string} mintAddress - The token mint address
 * @param {number} topN - Number of top wallets to return (default: 10)
 * @returns {Promise<Array<{wallet: string, balance: number, rank: number}>>}
 */
export async function getTopHolders(walletAddresses, mintAddress, topN = 10) {
  const balances = await getTokenBalances(walletAddresses, mintAddress);

  // Sort by balance (descending) and take top N
  const sorted = balances
    .sort((a, b) => b.balance - a.balance)
    .filter((entry) => entry.balance > 0) // Only include wallets with balance > 0
    .slice(0, topN)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return sorted;
}

/**
 * Gets leaderboard data formatted for the Podium component
 * Fetches top 3 holders and returns in the format expected by Podium
 * 
 * Note: This requires a mapping of wallet addresses to profile data (name and photo).
 * In a production system, this would come from:
 * - A Solana Program that stores user metadata
 * - An off-chain database (MongoDB) for display names and photos
 * - On-chain metadata accounts
 * 
 * @param {string[]} walletAddresses - Array of wallet addresses to check
 * @param {string} mintAddress - The token mint address (e.g., SoapToken)
 * @param {Object} walletToProfileMap - Map of wallet addresses to profile data {name, photo} (optional)
 * @returns {Promise<Array<{place: 1|2|3, name: string, wallet: string, balance: number, avatar?: string}>>}
 */
export async function getPodiumData(walletAddresses, mintAddress, walletToProfileMap = {}) {
  const topHolders = await getTopHolders(walletAddresses, mintAddress, 3);

  // Format for Podium component (top 3 only)
  return topHolders.slice(0, 3).map((entry, index) => {
    const walletLower = entry.wallet.toLowerCase();
    const profile = walletToProfileMap[walletLower] || {};
    
    return {
      place: (index + 1), // 1, 2, or 3
      name: profile.name || entry.wallet.slice(0, 4) + "..." + entry.wallet.slice(-4), // Use mapped name or short address
      wallet: entry.wallet,
      balance: entry.balance,
      avatar: profile.photo || null, // Include profile photo if available
    };
  });
}

