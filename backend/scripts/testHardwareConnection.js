/**
 * Test script to verify hardware connection to backend
 * Tests the /api/shower/hardware-input endpoint with Ryan Chang's wallet
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";
import User from "../models/User.js";

// ES module way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const MONGO_URI = process.env.MONGO_URI;

async function testHardwareConnection() {
  console.log("🧪 Testing Hardware Connection to Backend\n");

  try {
    // First, verify Ryan Chang exists and get his wallet
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      const ryan = await User.findOne({ displayName: "Ryan Chang" });
      
      if (!ryan) {
        console.error("❌ Ryan Chang not found in database!");
        console.error("   Please make sure Ryan Chang exists with wallet: 4nkeeh...fbz6");
        await mongoose.connection.close();
        process.exit(1);
      }

      const RYAN_WALLET = ryan.walletAddress;
      console.log(`✅ Found Ryan Chang`);
      console.log(`   Wallet: ${RYAN_WALLET.slice(0, 6)}...${RYAN_WALLET.slice(-4)}`);
      console.log(`   Current Points: ${ryan.totalPoints || 0}`);
      console.log(`   Current Showers: ${ryan.totalShowers || 0}`);
      console.log(`   Current CleanEnv Coins: ${ryan.totalCleanEnvCoins || 0}\n`);

      await mongoose.connection.close();

      // Test data - simulate a shower (12 minutes, optimal temp)
      const testShowerData = {
        walletAddress: RYAN_WALLET,
        actualTime: 720, // 12 minutes in seconds (optimal range)
        actualTemp: 38, // 38°C (optimal temperature)
      };

      console.log("📤 Sending test shower data to hardware-input endpoint:");
      console.log(`   Time: ${testShowerData.actualTime} seconds (${testShowerData.actualTime / 60} minutes)`);
      console.log(`   Temperature: ${testShowerData.actualTemp}°C\n`);

      const response = await fetch(`${API_BASE_URL}/api/shower/hardware-input`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testShowerData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Request failed:");
        console.error(`   Status: ${response.status}`);
        console.error(`   Error: ${data.error || data.message}`);
        process.exit(1);
      }

      if (data.success) {
        console.log("✅ Hardware connection successful!\n");
        console.log("📊 Shower Recorded:");
        console.log(`   Points earned: ${data.data.points}`);
        console.log(`   SoapToken coins: ${data.data.soapTokenCoins}`);
        console.log(`   CleanEnv coins: ${data.data.cleanEnvCoins}\n`);

        console.log("🔗 Blockchain Sync:");
        console.log(`   Status: ${data.data.blockchainSync.status}`);
        if (data.data.blockchainSync.soapTokenTx) {
          console.log(`   SoapToken TX: ${data.data.blockchainSync.soapTokenTx}`);
        }
        if (data.data.blockchainSync.cleanEnvTx) {
          console.log(`   CleanEnv TX: ${data.data.blockchainSync.cleanEnvTx}`);
        }
        if (data.data.blockchainSync.error) {
          console.log(`   ⚠️  Error: ${data.data.blockchainSync.error}`);
        }

        console.log("\n📈 Updated Totals:");
        console.log(`   Lifetime Points: ${data.data.lifetimeTotal.points}`);
        console.log(`   Total Showers: ${data.data.lifetimeTotal.showers}`);
        console.log(`   Total CleanEnv Coins: ${data.data.lifetimeTotal.cleanEnvCoins}`);
        console.log(`   Total SoapToken Coins: ${data.data.lifetimeTotal.soapTokenCoins}\n`);

        console.log("✅ Test completed successfully!");
        console.log("   Ryan Chang's data has been updated in MongoDB");
        if (data.data.blockchainSync.status === "synced") {
          console.log("   ✅ Tokens have been minted to Solana blockchain");
        } else {
          console.log("   ⚠️  Blockchain sync pending - run 'npm run init-solana' to generate treasury.json");
        }
      } else {
        console.error("❌ Request returned success: false");
        console.error(`   Error: ${data.error || data.message}`);
        process.exit(1);
      }
    } else {
      console.error("❌ MONGO_URI not set. Cannot verify Ryan Chang.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Connection error:");
    console.error(`   ${error.message}`);
    console.error("\n💡 Make sure:");
    console.error("   1. Backend server is running (npm run dev)");
    console.error("   2. API_BASE_URL is correct (default: http://localhost:3001)");
    console.error("   3. MongoDB is connected");
    process.exit(1);
  }
}

// Run the test
testHardwareConnection().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
