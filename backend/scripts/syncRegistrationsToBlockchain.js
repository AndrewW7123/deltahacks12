/**
 * Sync Registrations to Blockchain Script
 * Syncs existing user registrations from MongoDB to Solana blockchain
 * Can be run manually to backfill registrations
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import User from "../models/User.js";
import { recordRegistrationOnBlockchain } from "../utils/blockchainRegistration.js";

// ES module way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(__dirname, "../.env"), // backend/.env
  path.resolve(__dirname, "../../.env"), // root .env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`✅ Loaded environment variables from: ${envPath}`);
    break;
  }
}

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  console.log("🔄 Starting sync of user registrations to blockchain...\n");

  try {
    // Connect to MongoDB
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ Connected to MongoDB\n");
    } else {
      console.error("❌ MONGO_URI not set. Cannot sync without database connection.");
      process.exit(1);
    }

    // Find all users that haven't been synced to blockchain
    const usersToSync = await User.find({
      $or: [
        { "blockchainRegistration.synced": { $ne: true } },
        { "blockchainRegistration.synced": { $exists: false } },
      ],
    });

    console.log(`📊 Found ${usersToSync.length} users to sync to blockchain\n`);

    if (usersToSync.length === 0) {
      console.log("✅ All users are already synced to blockchain!");
      await mongoose.connection.close();
      return;
    }

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // Process each user
    for (const user of usersToSync) {
      try {
        console.log(`Processing: ${user.walletAddress}${user.displayName ? ` (${user.displayName})` : ""}...`);

        // Record registration on blockchain
        const blockchainResult = await recordRegistrationOnBlockchain({
          walletAddress: user.walletAddress,
          displayName: user.displayName,
          registeredAt: user.createdAt || new Date(),
          profileData: {
            heightFeet: user.heightFeet,
            heightInches: user.heightInches,
            weightLbs: user.weightLbs,
            hairLength: user.hairLength,
            hairType: user.hairType,
          },
        });

        if (blockchainResult.success) {
          // Update user with blockchain registration info
          await User.findOneAndUpdate(
            { walletAddress: user.walletAddress },
            {
              "blockchainRegistration.synced": true,
              "blockchainRegistration.txSignature": blockchainResult.txSignature,
              "blockchainRegistration.syncedAt": new Date(),
            }
          );

          console.log(`  ✅ Synced: ${blockchainResult.txSignature}`);
          results.processed++;
        } else {
          console.log(`  ❌ Failed: ${blockchainResult.error}`);
          results.failed++;
          results.errors.push({
            walletAddress: user.walletAddress,
            error: blockchainResult.error,
          });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ❌ Error processing ${user.walletAddress}:`, error.message);
        results.failed++;
        results.errors.push({
          walletAddress: user.walletAddress,
          error: error.message,
        });
      }
    }

    // Print summary
    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Processed: ${results.processed} users`);
    console.log(`   ❌ Failed: ${results.failed} users`);
    console.log(`   📝 Total: ${usersToSync.length} users`);

    if (results.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      results.errors.forEach((err) => {
        console.log(`   - ${err.walletAddress}: ${err.error}`);
      });
    }

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("\n✅ MongoDB connection closed");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;


