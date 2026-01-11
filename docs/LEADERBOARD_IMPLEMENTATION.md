# Solana Leaderboard Implementation

## Overview

The leaderboard system has been restructured to read data directly from the Solana blockchain. This implementation uses token balances (SoapToken tokens) as the ranking metric and can be migrated to a full Solana Program in the future.

## Files Created/Modified

### Backend

1. **`backend/utils/leaderboardSolana.js`** (NEW)
   - Core utility functions for fetching leaderboard data from Solana
   - Functions:
     - `getTokenBalance(walletAddress, mintAddress)` - Get token balance for a single wallet
     - `getTokenBalances(walletAddresses, mintAddress)` - Get balances for multiple wallets
     - `getTopHolders(walletAddresses, mintAddress, topN)` - Get top N wallets by balance
     - `getPodiumData(walletAddresses, mintAddress, walletToNameMap)` - Format data for Podium component

2. **`backend/routes/leaderboardRoutes.js`** (NEW)
   - REST API endpoints for leaderboard data
   - Endpoints:
     - `GET /api/leaderboard/podium` - Returns top 3 users for podium display
     - `GET /api/leaderboard/top?limit=N` - Returns top N users
     - `GET /api/leaderboard/balance/:walletAddress` - Returns balance for specific wallet

3. **`backend/server.js`** (MODIFIED)
   - Added leaderboard routes import
   - Registered `/api/leaderboard` route

### Frontend

1. **`frontend/hooks/useLeaderboard.ts`** (NEW)
   - React hook to fetch leaderboard data
   - Auto-refreshes every 30 seconds
   - Returns: `{ podiumData, loading, error }`

2. **`frontend/utils/avatar.ts`** (NEW)
   - Utility to generate avatar URLs from wallet addresses
   - Uses hash-based color generation for consistent avatars

3. **`frontend/components/Podium.tsx`** (MODIFIED)
   - Updated to accept wallet addresses and balances
   - Shows token balances below user names
   - Handles empty state (no users)
   - Generates avatars from wallet addresses

4. **`frontend/app/page.tsx`** (MODIFIED)
   - Updated to use `useLeaderboard` hook
   - Fetches real data from Solana instead of hardcoded data
   - Shows loading and error states

### Documentation

1. **`docs/SOLANA_LEADERBOARD_ARCHITECTURE.md`** (NEW)
   - Architecture documentation
   - Current implementation details
   - Future Solana Program migration path

2. **`requirements/api-keys.env.example`** (MODIFIED)
   - Added `SOAP_TOKEN_MINT_ADDRESS` environment variable
   - Added `SOLANA_RPC_URL` environment variable

## Setup Instructions

### 1. Initialize Solana Treasury and Tokens

First, run the initialization script to create the treasury wallet and mint tokens:

```bash
npm run init-solana
```

This will:
- Create a treasury wallet and save it to `backend/treasury.json`
- Request 2 SOL airdrop to the treasury
- Create SoapToken and ICE token mints
- Print the mint addresses to the console

**Important:** Copy the SoapToken mint address from the console output.

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# SoapToken Mint Address (from initSolana.js output)
SOAP_TOKEN_MINT_ADDRESS=<paste_soaptoken_mint_address_here>

# Solana RPC URL (optional, defaults to devnet)
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 3. Start the Server

```bash
npm run dev
```

The leaderboard API will be available at:
- `http://localhost:3001/api/leaderboard/podium`
- `http://localhost:3001/api/leaderboard/top?limit=10`
- `http://localhost:3001/api/leaderboard/balance/:walletAddress`

## How It Works

### Current Architecture

1. **Data Source**: Token balances on Solana blockchain
2. **Wallet Discovery**: Reads wallet addresses from MongoDB (users who have registered)
3. **Ranking**: Users are ranked by their SoapToken token balance
4. **Display Names**: Fetched from MongoDB (optional, falls back to shortened wallet address)

### Flow

```
Frontend (page.tsx)
  ↓
useLeaderboard hook
  ↓
Backend API (/api/leaderboard/podium)
  ↓
leaderboardRoutes.js
  ↓
leaderboardSolana.js (fetches balances from Solana)
  ↓
MongoDB (for wallet addresses and display names)
  ↓
Solana RPC (for token balances)
```

### Example API Response

**GET /api/leaderboard/podium**

```json
{
  "success": true,
  "data": [
    {
      "place": 1,
      "name": "Alice",
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "balance": 50000
    },
    {
      "place": 2,
      "name": "Bob",
      "wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "balance": 30000
    },
    {
      "place": 3,
      "name": "Carol",
      "wallet": "GjJyeC1r18hQXrGMp7fWNZy1hqN6ZQ9kx9hQjHqJvQvZ",
      "balance": 15000
    }
  ]
}
```

## Future Enhancements

### Phase 2: Solana Program

For a fully on-chain leaderboard, migrate to a Solana Program that stores:
- User stats (total showers, streaks, etc.)
- Rankings
- Leaderboard history

See `docs/SOLANA_LEADERBOARD_ARCHITECTURE.md` for detailed migration plan.

### Improvements

- **Indexer Integration**: Use Helius/QuickNode to discover all token holders automatically
- **Multiple Metrics**: Track streaks, sessions, achievements in addition to token balance
- **Real-time Updates**: WebSocket subscriptions for live leaderboard updates
- **Caching**: Cache balances to reduce RPC calls
- **Pagination**: Support for larger leaderboards with pagination

## Troubleshooting

### "SOAP_TOKEN_MINT_ADDRESS not configured"

- Make sure you've run `npm run init-solana`
- Copy the SoapToken mint address to your `.env` file

### "No wallet addresses found"

- Users need to register via the profile setup flow first
- The leaderboard only shows users who have registered in MongoDB

### Empty Leaderboard

- This is normal if no users have token balances yet
- Users need to complete showers and receive tokens to appear on the leaderboard

### Balance Not Updating

- Leaderboard refreshes every 30 seconds
- Token balances are read directly from Solana
- Make sure the user's wallet has received SoapToken tokens

## Notes

- The leaderboard currently requires wallet addresses to be in MongoDB (from user registration)
- For production, consider using an indexer (Helius, QuickNode) to discover all token holders
- Token balances are read in real-time from Solana (no caching currently)
- Display names are optional and fall back to shortened wallet addresses

