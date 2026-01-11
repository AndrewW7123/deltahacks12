/**
 * Blockchain Registration Utility
 * Records user registrations permanently on Solana blockchain using Memo program
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { loadTreasuryWallet } from "./loadTreasuryWallet.js";

// Environment variables
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Memo Program ID for storing data on blockchain
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQr");

/**
 * Record user registration on Solana blockchain
 * @param {Object} userData - User registration data
 * @param {string} userData.walletAddress - User's wallet address
 * @param {string} userData.displayName - User's display name (optional)
 * @param {Date} userData.registeredAt - Registration timestamp
 * @param {Object} userData.profileData - Profile data (optional)
 * @returns {Promise<{success: boolean, txSignature?: string, error?: string}>}
 */
export async function recordRegistrationOnBlockchain(userData) {
  try {
    // Setup connection and treasury wallet (loads from treasury.json or SOLANA_PRIVATE_KEY)
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const adminWallet = loadTreasuryWallet();

    // Validate user wallet address
    if (!userData.walletAddress) {
      throw new Error("walletAddress is required");
    }

    const userPublicKey = new PublicKey(userData.walletAddress);

    // Prepare registration data for memo
    const registrationData = {
      type: "USER_REGISTRATION",
      walletAddress: userData.walletAddress.toLowerCase(),
      displayName: userData.displayName || null,
      registeredAt: userData.registeredAt
        ? new Date(userData.registeredAt).toISOString()
        : new Date().toISOString(),
      profileData: userData.profileData || {},
      timestamp: new Date().toISOString(),
    };

    // Convert to JSON string (memo program can store up to ~566 bytes)
    let memoText = JSON.stringify(registrationData);

    // Check memo size (Solana memo limit is ~566 bytes)
    if (Buffer.from(memoText, "utf8").length > 566) {
      // Truncate profile data if needed
      const truncatedData = {
        ...registrationData,
        profileData: {
          hasHeight: !!userData.profileData?.heightFeet,
          hasWeight: !!userData.profileData?.weightLbs,
          hasHairInfo: !!(userData.profileData?.hairLength || userData.profileData?.hairType),
        },
      };
      const truncatedMemo = JSON.stringify(truncatedData);
      if (Buffer.from(truncatedMemo, "utf8").length > 566) {
        // Use minimal format
        memoText = `REG:${registrationData.walletAddress}:${registrationData.registeredAt}`;
      } else {
        memoText = truncatedMemo;
      }
    }

    // Create transaction
    const transaction = new Transaction();

    // Add Memo Instruction with registration data
    const memoInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: adminWallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: userPublicKey,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText, "utf8"),
    });
    transaction.add(memoInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminWallet.publicKey;

    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [adminWallet],
      {
        commitment: "confirmed",
      }
    );

    console.log(`✅ User registration recorded on blockchain:`, {
      walletAddress: userData.walletAddress,
      txSignature: signature,
    });

    return {
      success: true,
      txSignature: signature,
    };
  } catch (error) {
    console.error("Error recording registration on blockchain:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

/**
 * Batch record multiple user registrations on blockchain
 * @param {Array<Object>} users - Array of user data objects
 * @returns {Promise<{success: boolean, processed: number, failed: number, results: Array}>}
 */
export async function batchRecordRegistrations(users) {
  const results = {
    processed: 0,
    failed: 0,
    results: [],
  };

  for (const user of users) {
    const result = await recordRegistrationOnBlockchain(user);
    if (result.success) {
      results.processed++;
    } else {
      results.failed++;
    }
    results.results.push({
      walletAddress: user.walletAddress,
      ...result,
    });

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    success: true,
    ...results,
  };
}

