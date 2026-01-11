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
import { loadTreasuryWallet } from "./utils/loadTreasuryWallet.js";

// Load environment variables
const SOLANA_MINT_ADDRESS = process.env.SOLANA_MINT_ADDRESS;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Memo Program ID (as specified in requirements)
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQr");

/**
 * Mints SPL tokens to a user's wallet with quest data attached as a memo
 * @param {string} userWalletAddress - The user's wallet public key address
 * @param {number} baseAmount - Base amount of tokens to mint (in token's smallest unit)
 * @param {Array<{name: string, reward: number}>} questsCompleted - Array of quest objects with name and reward
 * @returns {Promise<{success: boolean, tx?: string, error?: string}>}
 */
export async function mintWithQuest(userWalletAddress, baseAmount, questsCompleted = []) {
  try {
    // Validate environment variables
    if (!SOLANA_MINT_ADDRESS) {
      throw new Error("SOLANA_MINT_ADDRESS environment variable is not set");
    }

    // Load treasury wallet (from treasury.json or SOLANA_PRIVATE_KEY)
    const adminWallet = loadTreasuryWallet();

    // Create connection
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    // Convert addresses to PublicKeys
    const userPublicKey = new PublicKey(userWalletAddress);
    const mintPublicKey = new PublicKey(SOLANA_MINT_ADDRESS);

    // Calculate total amount
    const questRewardsSum = questsCompleted.reduce((sum, quest) => sum + quest.reward, 0);
    const totalAmount = baseAmount + questRewardsSum;

    // Construct memo text
    const questNames = questsCompleted.map((q) => q.name).join(", ");
    const questNamesText = questNames ? questNames : "None";
    const memoText = `🚿 Proof-of-Shower: [${totalAmount}] SCRUB | Quests: [${questNamesText}]`;

    // Get or create the associated token account for the user
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      mintPublicKey,
      userPublicKey
    );

    // Create transaction
    const transaction = new Transaction();

    // Add Memo Instruction
    const memoInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: adminWallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
      ],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText, "utf8"),
    });
    transaction.add(memoInstruction);

    // Add MintTo Instruction
    const mintToInstruction = createMintToInstruction(
      mintPublicKey,
      userTokenAccount.address,
      adminWallet.publicKey,
      totalAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    transaction.add(mintToInstruction);

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

    return {
      success: true,
      tx: signature,
    };
  } catch (error) {
    console.error("Error in mintWithQuest:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

