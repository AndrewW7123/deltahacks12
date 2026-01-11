/**
 * Nightly Sync Script
 * Runs daily to sync MongoDB scores to Solana blockchain
 * Can be run manually or scheduled via cron
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { processNightlyBatchUpdate } from "../utils/solanaBatchUpdate.js";

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
  console.log("🌙 Starting nightly Solana sync...\n");

  try {
    // Connect to MongoDB
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ Connected to MongoDB\n");
    } else {
      console.error("❌ MONGO_URI not set. Cannot sync without database connection.");
      process.exit(1);
    }

    // Process batch update
    const result = await processNightlyBatchUpdate();

    if (result.success) {
      console.log(`\n✅ Sync complete!`);
      console.log(`   Processed: ${result.processed} users`);
      console.log(`   Transactions: ${result.transactions.length}`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors.forEach((err) => {
          console.log(`     - ${err.walletAddress}: ${err.error}`);
        });
      }
    } else {
      console.error(`\n❌ Sync failed: ${result.error}`);
      process.exit(1);
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

