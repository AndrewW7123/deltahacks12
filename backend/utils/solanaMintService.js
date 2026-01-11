/**
 * Solana Mint Service
 * Handles immediate token minting to Solana blockchain
 * Used for real-time reward distribution when showers are completed
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMintToInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { loadTreasuryWallet } from "./loadTreasuryWallet.js";

// Environment variables
const SOAP_TOKEN_MINT_ADDRESS = process.env.SOAP_TOKEN_MINT_ADDRESS;
const CLEAN_ENV_MINT_ADDRESS = process.env.CLEAN_ENV_MINT_ADDRESS;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

/**
 * Mint tokens to a user's wallet immediately
 * @param {string} userWalletAddress - User's wallet address (string)
 * @param {number} soapTokenAmount - Amount of SoapToken to mint
 * @param {number} cleanEnvAmount - Amount of CleanEnv to mint
 * @returns {Promise<{success: boolean, soapTokenTx?: string, cleanEnvTx?: string, error?: string}>}
 */
export async function mintRewardsImmediately(userWalletAddress, soapTokenAmount, cleanEnvAmount) {
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
    const userPublicKey = new PublicKey(userWalletAddress);

    const results = {
      soapTokenTx: null,
      cleanEnvTx: null,
    };

    // Mint SoapToken if amount > 0
    if (soapTokenAmount > 0) {
      try {
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          adminWallet,
          soapTokenMint,
          userPublicKey
        );

        const transaction = new Transaction();
        const mintToInstruction = createMintToInstruction(
          soapTokenMint,
          userTokenAccount.address,
          adminWallet.publicKey,
          soapTokenAmount,
          [],
          TOKEN_PROGRAM_ID
        );
        transaction.add(mintToInstruction);

        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = adminWallet.publicKey;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [adminWallet],
          {
            commitment: "confirmed",
          }
        );

        results.soapTokenTx = signature;
        console.log(`✅ Minted ${soapTokenAmount} SoapToken to ${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}: ${signature}`);
      } catch (error) {
        console.error(`❌ Error minting SoapToken:`, error.message);
        throw new Error(`SoapToken mint failed: ${error.message}`);
      }
    }

    // Mint CleanEnv if amount > 0
    if (cleanEnvAmount > 0) {
      try {
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          adminWallet,
          cleanEnvMint,
          userPublicKey
        );

        const transaction = new Transaction();
        const mintToInstruction = createMintToInstruction(
          cleanEnvMint,
          userTokenAccount.address,
          adminWallet.publicKey,
          cleanEnvAmount,
          [],
          TOKEN_PROGRAM_ID
        );
        transaction.add(mintToInstruction);

        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = adminWallet.publicKey;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [adminWallet],
          {
            commitment: "confirmed",
          }
        );

        results.cleanEnvTx = signature;
        console.log(`✅ Minted ${cleanEnvAmount} CleanEnv to ${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}: ${signature}`);
      } catch (error) {
        console.error(`❌ Error minting CleanEnv:`, error.message);
        throw new Error(`CleanEnv mint failed: ${error.message}`);
      }
    }

    return {
      success: true,
      ...results,
    };
  } catch (error) {
    console.error("Error in mintRewardsImmediately:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}
