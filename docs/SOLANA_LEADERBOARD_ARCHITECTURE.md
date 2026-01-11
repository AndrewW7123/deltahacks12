# Solana Leaderboard Architecture

## Overview

This document outlines the current implementation and future migration path to a fully on-chain Solana program for the leaderboard system.

## Current Implementation (Phase 1)

### Architecture
- **Backend**: Node.js/Express API that reads token balances from Solana
- **Frontend**: Next.js component that fetches leaderboard data via API
- **Data Source**: Token balances (SoapToken token) from Solana blockchain
- **Storage**: MongoDB for wallet-to-name mapping (display names)

### Components

1. **`backend/utils/leaderboardSolana.js`**
   - Functions to fetch token balances from Solana
   - `getTokenBalance()`: Get balance for a single wallet
   - `getTopHolders()`: Get top N wallets by token balance
   - `getPodiumData()`: Format data for Podium component

2. **`backend/routes/leaderboardRoutes.js`**
   - REST API endpoints:
     - `GET /api/leaderboard/podium` - Top 3 for podium display
     - `GET /api/leaderboard/top` - Top N wallets
     - `GET /api/leaderboard/balance/:wallet` - Balance for specific wallet

3. **`frontend/hooks/useLeaderboard.ts`**
   - React hook to fetch leaderboard data
   - Auto-refreshes every 30 seconds

4. **`frontend/components/Podium.tsx`**
   - Visual leaderboard component
   - Displays top 3 users with avatars and balances

### Limitations

- **Wallet Discovery**: Currently requires knowing wallet addresses in advance (from MongoDB users)
- **Not Fully On-Chain**: Uses MongoDB for display names
- **No Complex Metrics**: Only tracks token balances, not streaks, sessions, etc.
- **Performance**: Requires checking each wallet balance individually

## Future Implementation (Phase 2: Solana Program)

### Architecture Goal

A dedicated Solana Program (smart contract) that stores leaderboard data entirely on-chain.

### Proposed Solana Program Structure

```rust
// Anchor program structure (pseudo-code)

pub struct LeaderboardEntry {
    pub wallet: Pubkey,           // User's wallet address
    pub total_showers: u64,       // Total number of completed showers
    pub total_tokens: u64,        // Total SoapToken tokens earned
    pub current_streak: u32,      // Current streak (days)
    pub longest_streak: u32,      // Longest streak achieved
    pub last_shower: i64,         // Unix timestamp of last shower
    pub rank: u32,                // Current rank (updated on each entry)
    pub bump: u8,                 // PDA bump
}

pub struct GlobalLeaderboard {
    pub total_entries: u64,       // Total number of participants
    pub last_updated: i64,        // Last update timestamp
    pub admin: Pubkey,            // Program admin
    pub bump: u8,
}
```

### Program Instructions

1. **`initialize`**: Initialize the leaderboard program
2. **`create_entry`**: Create a new leaderboard entry for a user
3. **`update_entry`**: Update user stats after completing a shower
4. **`get_top_n`**: Query instruction to get top N users
5. **`get_podium`**: Query instruction to get top 3 for podium

### Implementation Steps

1. **Set up Anchor Framework**
   ```bash
   anchor init shower-leaderboard
   cd shower-leaderboard
   ```

2. **Write the Program** (`programs/shower-leaderboard/src/lib.rs`)
   - Define account structures
   - Implement instructions
   - Handle ranking logic

3. **Build and Deploy**
   ```bash
   anchor build
   anchor deploy
   ```

4. **Update Backend**
   - Replace token balance reading with program account queries
   - Use Anchor IDL for type-safe interactions

5. **Update Frontend**
   - Option 1: Read directly from Solana (using @solana/web3.js)
   - Option 2: Use backend API that queries the program
   - Option 3: Use a GraphQL indexer (Helius, QuickNode)

### Benefits of Solana Program Approach

- ✅ **Fully On-Chain**: All data stored on Solana blockchain
- ✅ **Decentralized**: No reliance on MongoDB
- ✅ **Transparent**: All leaderboard logic is public and verifiable
- ✅ **Efficient Queries**: Optimized account structures for fast lookups
- ✅ **Complex Metrics**: Can track streaks, sessions, achievements
- ✅ **Real-time**: Updates reflect immediately on-chain

### Challenges

- **Cost**: Each write operation costs SOL (transaction fees)
- **Account Size Limits**: Solana accounts have size limits (10KB max)
- **Querying**: Getting all entries requires either:
  - Known wallet addresses
  - Indexer service (Helius, QuickNode)
  - Program-derived address (PDA) enumeration
- **Ranking Logic**: Complex ranking updates require careful program design

### Hybrid Approach (Recommended Migration Path)

1. **Phase 1** (Current): Token balance-based leaderboard
2. **Phase 2**: Add Solana Program for entry storage
3. **Phase 3**: Migrate display names to on-chain metadata
4. **Phase 4**: Full on-chain leaderboard

## Environment Variables

```env
# Required for current implementation
SOAP_TOKEN_MINT_ADDRESS=...          # SoapToken token mint address (from initSolana.js)
SOLANA_RPC_URL=https://api.devnet.solana.com

# Future: Solana Program
LEADERBOARD_PROGRAM_ID=...     # Deployed program ID
LEADERBOARD_GLOBAL_PDA=...     # Global leaderboard PDA address
```

## Resources

- [Solana Program Documentation](https://docs.solana.com/developing/programming-model/overview)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Helius API](https://docs.helius.dev/) - For indexing and querying

