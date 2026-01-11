/**
 * Solana Batch Update Utility
 * Updates Solana blockchain with daily coin distributions (runs nightly)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMintToInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import User from "../models/User.js";
import { loadTreasuryWallet } from "./loadTreasuryWallet.js";

// Environment variables
const SOAP_TOKEN_MINT_ADDRESS = process.env.SOAP_TOKEN_MINT_ADDRESS;
const CLEAN_ENV_MINT_ADDRESS = process.env.CLEAN_ENV_MINT_ADDRESS;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQr");

/**
 * Mint tokens to a user's wallet
 * @param {Connection} connection - Solana connection
 * @param {Keypair} adminWallet - Admin wallet (payer)
 * @param {PublicKey} mintAddress - Token mint address
 * @param {PublicKey} userPublicKey - User's wallet public key
 * @param {number} amount - Amount to mint (in token's smallest unit, 0 decimals = whole tokens)
 * @returns {Promise<string>} Transaction signature
 */
async function mintTokens(connection, adminWallet, mintAddress, userPublicKey, amount) {
  if (amount <= 0) return null; // Skip if no tokens to mint

  // Get or create user's token account
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    adminWallet,
    mintAddress,
    userPublicKey
  );

  // Create transaction
  const transaction = new Transaction();

  // Add MintTo instruction
  const mintToInstruction = createMintToInstruction(
    mintAddress,
    userTokenAccount.address,
    adminWallet.publicKey,
    amount,
    [],
    TOKEN_PROGRAM_ID
  );
  transaction.add(mintToInstruction);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminWallet.publicKey;

  // Sign and send
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [adminWallet],
    {
      commitment: "confirmed",
    }
  );

  return signature;
}

/**
 * Process nightly batch update for all users
 * Mints coins to Solana for yesterday's showers
 * @returns {Promise<{success: boolean, processed: number, errors: Array}>}
 */
export async function processNightlyBatchUpdate() {
  try {
    // Validate environment variables
    if (!SOAP_TOKEN_MINT_ADDRESS) {
      throw new Error("SOAP_TOKEN_MINT_ADDRESS environment variable is not set");
    }
    if (!CLEAN_ENV_MINT_ADDRESS) {
      throw new Error("CLEAN_ENV_MINT_ADDRESS environment variable is not set");
    }

    // Setup connection and treasury wallet (loads from treasury.json or SOLANA_PRIVATE_KEY)
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const adminWallet = loadTreasuryWallet();

    const soapTokenMint = new PublicKey(SOAP_TOKEN_MINT_ADDRESS);
    const cleanEnvMint = new PublicKey(CLEAN_ENV_MINT_ADDRESS);

    // Get yesterday's date (start of day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    // Find all users with showers from yesterday
    const users = await User.find({
      dailyScores: {
        $elemMatch: {
          date: yesterday,
          $or: [
            { soapTokenCoins: { $gt: 0 } },
            { cleanEnvCoins: { $gt: 0 } },
          ],
        },
      },
    });

    console.log(`🔄 Processing nightly batch update for ${users.length} users...`);

    const results = {
      processed: 0,
      errors: [],
      transactions: [],
    };

    // Process each user
    for (const user of users) {
      try {
        // Find yesterday's score
        const yesterdayScore = user.dailyScores.find((score) => {
          const scoreDate = new Date(score.date);
          scoreDate.setUTCHours(0, 0, 0, 0);
          return scoreDate.getTime() === yesterday.getTime();
        });

        if (!yesterdayScore) continue;

        const userPublicKey = new PublicKey(user.walletAddress);
        const txSignatures = [];

        // Mint SoapToken coins
        if (yesterdayScore.soapTokenCoins > 0) {
          try {
            const signature = await mintTokens(
              connection,
              adminWallet,
              soapTokenMint,
              userPublicKey,
              yesterdayScore.soapTokenCoins
            );
            if (signature) {
              txSignatures.push({ type: "SoapToken", signature, amount: yesterdayScore.soapTokenCoins });
            }
          } catch (error) {
            console.error(`Error minting SoapToken for ${user.walletAddress}:`, error.message);
            results.errors.push({
              walletAddress: user.walletAddress,
              type: "SoapToken",
              error: error.message,
            });
          }
        }

        // Mint CleanEnv coins
        if (yesterdayScore.cleanEnvCoins > 0) {
          try {
            const signature = await mintTokens(
              connection,
              adminWallet,
              cleanEnvMint,
              userPublicKey,
              yesterdayScore.cleanEnvCoins
            );
            if (signature) {
              txSignatures.push({ type: "CleanEnv", signature, amount: yesterdayScore.cleanEnvCoins });
            }
          } catch (error) {
            console.error(`Error minting CleanEnv for ${user.walletAddress}:`, error.message);
            results.errors.push({
              walletAddress: user.walletAddress,
              type: "CleanEnv",
              error: error.message,
            });
          }
        }

        if (txSignatures.length > 0) {
          // Mark yesterday's score as synced (optional: add a syncedToSolana flag)
          // For now, we'll just log the transactions
          results.transactions.push({
            walletAddress: user.walletAddress,
            signatures: txSignatures,
          });
          results.processed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing user ${user.walletAddress}:`, error.message);
        results.errors.push({
          walletAddress: user.walletAddress,
          error: error.message,
        });
      }
    }

    console.log(`✅ Nightly batch update complete: ${results.processed} users processed`);
    return {
      success: true,
      ...results,
    };
  } catch (error) {
    console.error("Error in processNightlyBatchUpdate:", error);
    return {
      success: false,
      error: error.message,
      processed: 0,
      errors: [],
      transactions: [],
    };
  }
}

