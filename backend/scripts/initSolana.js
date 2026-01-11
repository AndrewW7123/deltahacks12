import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
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
    // Step 1: Load or Generate Treasury Wallet
    let treasuryWallet;
    let treasuryPublicKey;
    
    if (fs.existsSync(TREASURY_FILE)) {
      console.log("1️⃣  Loading existing Treasury Wallet...");
      const treasuryData = JSON.parse(fs.readFileSync(TREASURY_FILE, "utf8"));
      const secretKey = bs58.decode(treasuryData.secretKey);
      treasuryWallet = Keypair.fromSecretKey(secretKey);
      treasuryPublicKey = treasuryWallet.publicKey;
      console.log(`   ✅ Loaded Treasury Public Key: ${treasuryPublicKey.toString()}`);
    } else {
      console.log("1️⃣  Generating Treasury Wallet...");
      treasuryWallet = Keypair.generate();
      treasuryPublicKey = treasuryWallet.publicKey;
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
      console.log(`   💾 Saved treasury wallet to: ${TREASURY_FILE}`);
    }

    // Check current balance
    let balance = await connection.getBalance(treasuryPublicKey);
    let solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`   💰 Current balance: ${solBalance} SOL\n`);

    // Step 2: Request Airdrop (only if balance is insufficient)
    const MIN_BALANCE_REQUIRED = 1.5; // Need at least 1.5 SOL for transactions
    
    if (solBalance < MIN_BALANCE_REQUIRED) {
      console.log("2️⃣  Balance insufficient. Requesting 2 SOL airdrop...");
      let airdropSignature;
      let airdropRetries = 0;
      const maxAirdropRetries = 5;
      
      while (airdropRetries < maxAirdropRetries) {
        try {
          airdropSignature = await connection.requestAirdrop(
            treasuryPublicKey,
            AIRDROP_AMOUNT
          );
          console.log(`   ✅ Airdrop signature: ${airdropSignature}`);
          break; // Success, exit retry loop
        } catch (error) {
          airdropRetries++;
          if (error.message.includes("429") || error.message.includes("Too Many Requests") || error.message.includes("Internal error")) {
            if (airdropRetries < maxAirdropRetries) {
              const delaySeconds = airdropRetries * 3; // Exponential backoff: 3s, 6s, 9s, 12s, 15s
              console.log(`   ⚠️  Rate limited. Waiting ${delaySeconds} seconds before retry (${airdropRetries}/${maxAirdropRetries})...`);
              await wait(delaySeconds * 1000);
            } else {
              console.log(`\n   ❌ Airdrop failed after ${maxAirdropRetries} retries due to rate limiting.`);
              console.log(`   💡 You can manually fund the wallet with dev SOL and run this script again.`);
              console.log(`   📍 Wallet Address: ${treasuryPublicKey.toString()}`);
              console.log(`   💧 Use a Solana faucet: https://faucet.solana.com/`);
              throw new Error(`Airdrop failed. Please fund wallet manually or try again in a few minutes.`);
            }
          } else {
            throw error; // Re-throw if it's not a rate limit error
          }
        }
      }

      // Wait for airdrop confirmation
      await waitForAirdropConfirmation(connection, airdropSignature);

      // Verify balance after airdrop
      balance = await connection.getBalance(treasuryPublicKey);
      solBalance = balance / LAMPORTS_PER_SOL;
      console.log(`   💰 New balance: ${solBalance} SOL\n`);

      if (solBalance < MIN_BALANCE_REQUIRED) {
        throw new Error(`Insufficient balance after airdrop. Current: ${solBalance} SOL, Required: ${MIN_BALANCE_REQUIRED} SOL`);
      }
    } else {
      console.log("2️⃣  ✅ Balance sufficient, skipping airdrop\n");
    }

    // Step 3: Create Token Mints
    console.log("3️⃣  Creating Token Mints...\n");

    // Create SoapToken Token Mint
    console.log("   Creating SoapToken token mint...");
    const soapTokenMint = await createMint(
      connection,
      treasuryWallet, // Payer
      treasuryPublicKey, // Mint authority
      null, // Freeze authority (null = no freeze)
      0, // Decimals (0 = whole tokens)
      undefined, // Keypair (auto-generate)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ SoapToken Mint Address: ${soapTokenMint.toString()}`);

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
    console.log(`   ✅ ICE Mint Address: ${ICEMint.toString()}`);

    // Create CleanEnv Token Mint
    console.log("   Creating CleanEnv token mint...");
    const cleanEnvMint = await createMint(
      connection,
      treasuryWallet, // Payer
      treasuryPublicKey, // Mint authority
      null, // Freeze authority (null = no freeze)
      0, // Decimals (0 = whole tokens)
      undefined, // Keypair (auto-generate)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ CleanEnv Mint Address: ${cleanEnvMint.toString()}\n`);

    // Step 4: Mint Tokens to Treasury
    console.log("4️⃣  Minting tokens to Treasury...\n");

    // Small delay to ensure mints are fully propagated
    await wait(1000);

    // Mint SoapToken tokens
    console.log(`   Minting ${TOKEN_AMOUNT.toLocaleString()} SoapToken tokens...`);
    let soapTokenAccount;
    try {
      soapTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryWallet,
        soapTokenMint,
        treasuryPublicKey
      );
    } catch (error) {
      console.error(`   ⚠️  Error creating SoapToken account: ${error.message}`);
      console.log(`   Retrying after delay...`);
      // Retry once after a short delay
      await wait(2000);
      soapTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryWallet,
        soapTokenMint,
        treasuryPublicKey
      );
    }

    const soapTokenMintSignature = await mintTo(
      connection,
      treasuryWallet, // Payer
      soapTokenMint, // Mint
      soapTokenAccount.address, // Destination
      treasuryWallet, // Authority (mint authority keypair)
      TOKEN_AMOUNT, // Amount
      [], // Multi-signers (none)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ SoapToken mint transaction: ${soapTokenMintSignature}`);

    // Verify SoapToken balance
    const soapTokenBalance = await connection.getTokenAccountBalance(soapTokenAccount.address);
    console.log(`   🧼 SoapToken Treasury balance: ${soapTokenBalance.value.uiAmount?.toLocaleString()} tokens\n`);

    // Mint ICE tokens
    console.log(`   Minting ${TOKEN_AMOUNT.toLocaleString()} ICE tokens...`);
    let ICETokenAccount;
    try {
      ICETokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryWallet,
        ICEMint,
        treasuryPublicKey
      );
    } catch (error) {
      console.error(`   ⚠️  Error creating ICE account: ${error.message}`);
      console.log(`   Retrying after delay...`);
      await wait(2000);
      ICETokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryWallet,
        ICEMint,
        treasuryPublicKey
      );
    }

    const ICEMintSignature = await mintTo(
      connection,
      treasuryWallet, // Payer
      ICEMint, // Mint
      ICETokenAccount.address, // Destination
      treasuryWallet, // Authority (mint authority keypair)
      TOKEN_AMOUNT, // Amount
      [], // Multi-signers (none)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ ICE mint transaction: ${ICEMintSignature}`);
    
    // Verify ICE balance
    const ICEBalance = await connection.getTokenAccountBalance(ICETokenAccount.address);
    console.log(`   ❄️  ICE Treasury balance: ${ICEBalance.value.uiAmount?.toLocaleString()} tokens\n`);

    // Mint CleanEnv tokens
    console.log(`   Minting ${TOKEN_AMOUNT.toLocaleString()} CleanEnv tokens...`);
    let cleanEnvTokenAccount;
    try {
      cleanEnvTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryWallet,
        cleanEnvMint,
        treasuryPublicKey
      );
    } catch (error) {
      console.error(`   ⚠️  Error creating CleanEnv account: ${error.message}`);
      console.log(`   Retrying after delay...`);
      await wait(2000);
      cleanEnvTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryWallet,
        cleanEnvMint,
        treasuryPublicKey
      );
    }

    const cleanEnvMintSignature = await mintTo(
      connection,
      treasuryWallet, // Payer
      cleanEnvMint, // Mint
      cleanEnvTokenAccount.address, // Destination
      treasuryWallet, // Authority (mint authority keypair)
      TOKEN_AMOUNT, // Amount
      [], // Multi-signers (none)
      undefined, // Confirmation options
      TOKEN_PROGRAM_ID
    );
    console.log(`   ✅ CleanEnv mint transaction: ${cleanEnvMintSignature}`);

    // Verify CleanEnv balance
    const cleanEnvBalance = await connection.getTokenAccountBalance(cleanEnvTokenAccount.address);
    console.log(`   🌿 CleanEnv Treasury balance: ${cleanEnvBalance.value.uiAmount?.toLocaleString()} tokens\n`);

    // Final Summary
    console.log("=".repeat(60));
    console.log("🎉 Treasury Setup Complete!\n");
    console.log("📋 Summary:");
    console.log(`   Treasury Public Key: ${treasuryPublicKey.toString()}`);
    console.log(`   Treasury Balance: ${solBalance} SOL`);
    console.log(`   Treasury File: ${TREASURY_FILE}\n`);
    console.log("🪙 Token Mint Addresses (Copy these!):");
    console.log(`   SoapToken Mint Address: ${soapTokenMint.toString()}`);
    console.log(`   ICE Mint Address: ${ICEMint.toString()}`);
    console.log(`   CleanEnv Mint Address: ${cleanEnvMint.toString()}\n`);
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

