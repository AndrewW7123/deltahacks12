import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const AIRDROP_AMOUNT = 2 * LAMPORTS_PER_SOL; // 2 SOL
const TOKEN_AMOUNT = 1_000_000; // 1,000,000 tokens (assuming 0 decimals, adjust if needed)
const TREASURY_FILE = path.resolve(__dirname, "../treasury.json");

// Wait function
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wait for airdrop confirmation
async function waitForAirdropConfirmation(connection, signature, maxRetries = 30) {
  console.log("⏳ Waiting for airdrop confirmation...");
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await connection.getSignatureStatus(signature);
      
      if (status.value && status.value.confirmationStatus) {
        if (status.value.err) {
          throw new Error(`Airdrop failed: ${JSON.stringify(status.value.err)}`);
        }
        
        if (status.value.confirmationStatus === "confirmed" || status.value.confirmationStatus === "finalized") {
          console.log(`✅ Airdrop confirmed (${status.value.confirmationStatus})`);
          return true;
        }
      }
      
      // Wait 1 second before checking again
      await wait(1000);
      if (i % 5 === 0) {
        console.log(`   Still waiting... (${i + 1}/${maxRetries})`);
      }
    } catch (error) {
      console.warn(`   Warning while checking status: ${error.message}`);
      await wait(1000);
    }
  }
  
  throw new Error("Airdrop confirmation timed out");
}

async function main() {
  console.log("🚀 Initializing Solana Treasury and Tokens on Devnet\n");

  // Create connection to Devnet
  const connection = new Connection(DEVNET_RPC_URL, "confirmed");
  console.log(`📡 Connected to Solana Devnet: ${DEVNET_RPC_URL}\n`);

  try {
    // Step 1: Generate Treasury Wallet
    console.log("1️⃣  Generating Treasury Wallet...");
    const treasuryWallet = Keypair.generate();
    const treasuryPublicKey = treasuryWallet.publicKey;
    console.log(`   ✅ Treasury Public Key: ${treasuryPublicKey.toString()}`);

    // Encode secret key to base58 for storage
    const secretKeyBase58 = bs58.encode(treasuryWallet.secretKey);
    const treasuryData = {
      publicKey: treasuryPublicKey.toString(),
      secretKey: secretKeyBase58,
      // Also store as array for compatibility
      secretKeyArray: Array.from(treasuryWallet.secretKey),
    };

    // Save to treasury.json
    fs.writeFileSync(TREASURY_FILE, JSON.stringify(treasuryData, null, 2));
    console.log(`   💾 Saved treasury wallet to: ${TREASURY_FILE}\n`);

    // Step 2: Request Airdrop
    console.log("2️⃣  Requesting 2 SOL airdrop...");
    const airdropSignature = await connection.requestAirdrop(
      treasuryPublicKey,
      AIRDROP_AMOUNT
    );
    console.log(`   ✅ Airdrop signature: ${airdropSignature}`);

    // Wait for airdrop confirmation
    await waitForAirdropConfirmation(connection, airdropSignature);

    // Verify balance
    const balance = await connection.getBalance(treasuryPublicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`   💰 Treasury balance: ${solBalance} SOL\n`);

    if (solBalance < 1) {
      throw new Error("Insufficient balance after airdrop");
    }

    // Step 3: Create Token Mints
    console.log("3️⃣  Creating Token Mints...\n");

    // Create vH2O Token Mint
    console.log("   Creating vH2O token mint...");
    const vH2OMint = await createMint(
      connection,
      treasuryWallet, // Payer
      treasuryPublicKey, // Mint authority
      null, // Freeze authority (null = no freeze)
      0, // Decimals (0 = whole tokens)
      undefined, // Keypair (auto-generate)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ vH2O Mint Address: ${vH2OMint.toString()}`);

    // Create ICE Token Mint
    console.log("   Creating ICE token mint...");
    const ICEMint = await createMint(
      connection,
      treasuryWallet, // Payer
      treasuryPublicKey, // Mint authority
      null, // Freeze authority (null = no freeze)
      0, // Decimals (0 = whole tokens)
      undefined, // Keypair (auto-generate)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ ICE Mint Address: ${ICEMint.toString()}\n`);

    // Step 4: Mint Tokens to Treasury
    console.log("4️⃣  Minting tokens to Treasury...\n");

    // Mint vH2O tokens
    console.log(`   Minting ${TOKEN_AMOUNT.toLocaleString()} vH2O tokens...`);
    const vH2OTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryWallet,
      vH2OMint,
      treasuryPublicKey
    );

    const vH2OMintSignature = await mintTo(
      connection,
      treasuryWallet, // Payer
      vH2OMint, // Mint
      vH2OTokenAccount.address, // Destination
      treasuryPublicKey, // Authority
      TOKEN_AMOUNT, // Amount
      [], // Multi-signers (none)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ vH2O mint transaction: ${vH2OMintSignature}`);
    
    // Verify vH2O balance
    const vH2OBalance = await connection.getTokenAccountBalance(vH2OTokenAccount.address);
    console.log(`   💧 vH2O Treasury balance: ${vH2OBalance.value.uiAmount?.toLocaleString()} tokens\n`);

    // Mint ICE tokens
    console.log(`   Minting ${TOKEN_AMOUNT.toLocaleString()} ICE tokens...`);
    const ICETokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryWallet,
      ICEMint,
      treasuryPublicKey
    );

    const ICEMintSignature = await mintTo(
      connection,
      treasuryWallet, // Payer
      ICEMint, // Mint
      ICETokenAccount.address, // Destination
      treasuryPublicKey, // Authority
      TOKEN_AMOUNT, // Amount
      [], // Multi-signers (none)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ ICE mint transaction: ${ICEMintSignature}`);
    
    // Verify ICE balance
    const ICEBalance = await connection.getTokenAccountBalance(ICETokenAccount.address);
    console.log(`   ❄️  ICE Treasury balance: ${ICEBalance.value.uiAmount?.toLocaleString()} tokens\n`);

    // Final Summary
    console.log("=".repeat(60));
    console.log("🎉 Treasury Setup Complete!\n");
    console.log("📋 Summary:");
    console.log(`   Treasury Public Key: ${treasuryPublicKey.toString()}`);
    console.log(`   Treasury Balance: ${solBalance} SOL`);
    console.log(`   Treasury File: ${TREASURY_FILE}\n`);
    console.log("🪙 Token Mint Addresses (Copy these!):");
    console.log(`   vH2O Mint Address: ${vH2OMint.toString()}`);
    console.log(`   ICE Mint Address: ${ICEMint.toString()}\n`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error during initialization:");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

