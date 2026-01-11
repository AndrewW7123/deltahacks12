# Shower% - Solana & MongoDB Implementation Overview

## Executive Summary

Shower% is a Proof-of-Shower application that combines Solana blockchain technology with MongoDB for user data management. The system tracks user shower performance, calculates scores based on optimal shower parameters, and distributes rewards (tokens) on the Solana blockchain.

---

## Architecture Overview

The application uses a **hybrid architecture**:
- **MongoDB**: Stores user profiles, daily shower scores, and points (immediate updates)
- **Solana Blockchain**: Stores token balances and handles nightly batch updates for coin distribution

### Key Principle: MongoDB First, Solana Second

- **Real-time scoring**: All shower completions and point calculations happen immediately in MongoDB
- **Nightly blockchain sync**: Token rewards are minted to Solana once per day via batch process
- **Leaderboard**: Ranks users by `totalPoints` from MongoDB (not token balances)

---

## MongoDB Implementation

### User Schema (`backend/models/User.js`)

The MongoDB User model stores:

#### Profile Data
- `walletAddress` (unique, indexed) - Solana wallet public key
- `displayName` - User's display name
- `profilePhoto` - URL to profile photo
- Physical characteristics (height, weight, hair type/length)
- Calculated goals (`idealTimeRange`, `idealTemp`)

#### Score Tracking
- **Daily Scores Array** (`dailyScores[]`):
  - `date` - Date of the day
  - `totalPoints` - Points earned that day
  - `showerCount` - Number of showers that day
  - `cleanEnvCoins` - CleanEnv coins earned
  - `soapTokenCoins` - SoapToken coins earned
  - `showers[]` - Array of individual shower records (time, temperature, points, coins)

#### Lifetime Stats
- `totalPoints` - Cumulative points across all showers
- `totalShowers` - Total number of showers completed
- `totalCleanEnvCoins` - Total CleanEnv coins earned
- `totalSoapTokenCoins` - Total SoapToken coins earned

### API Endpoints

#### Profile Management (`/api/profile`)
- `POST /setup` - Create/update user profile with questionnaire data
- `GET /:walletAddress` - Get user profile by wallet address

#### Shower Recording (`/api/shower`)
- `POST /complete` - Record a completed shower
  - Input: `walletAddress`, `actualTime` (seconds), `actualTemp` (Celsius)
  - Output: Points earned, coins earned (CleanEnv, SoapToken)
  - **Immediately updates MongoDB** with shower data and scores

- `GET /daily/:walletAddress` - Get today's shower data for a user

#### Leaderboard (`/api/leaderboard`)
- `GET /podium` - Get top 3 users by `totalPoints`
- `GET /top?limit=10` - Get top N users by `totalPoints`
- `GET /score/:walletAddress` - Get a specific user's score

---

## Points & Scoring System

### Points Calculation (`backend/utils/pointsCalculator.js`)

**Total Points: 100 per shower**
- **80 points** - Time-based scoring (how close to optimal time range)
- **20 points** - Temperature-based scoring (how close to optimal temperature)

#### Time Points (0-80)
- Within optimal range: 70-80 points (perfect center = 80)
- Below minimum: 0-50 points (30% below = 0 points)
- Above maximum: 0-50 points (70% above max = 0 points)

#### Temperature Points (0-20)
- Within ±2°C of ideal (38°C): 15-20 points
- Outside range: Decreases with distance

### Coin Distribution

#### CleanEnv (Environmental) Coins
- **2 coins**: Within optimal time range (min to max)
- **1 coin**: Optimal + 10% or less (max to 110% of max)
- **0 coins**: Over limit (above max), 30% below optimal, or 170% above optimal

#### SoapToken (Shower Performance) Coins
- **2 coins**: Within 20% range of optimal (80% to 120% of range)
- **1 coin**: Optimal + 10% or less (max to 110% of max)
- **0 coins**: Over limit, 30% below optimal, or 170% above optimal

---

## Solana Implementation

### Token Mints

Three SPL tokens are created on Solana Devnet:

1. **SoapToken** (`SOAP_TOKEN_MINT_ADDRESS`)
   - Used for shower performance rewards
   - Currently used for leaderboard (historically, now replaced by MongoDB scores)

2. **ICE** (`ICE_MINT_ADDRESS`)
   - Legacy token (may be used for future features)

3. **CleanEnv** (`CLEAN_ENV_MINT_ADDRESS`)
   - Environmental rewards for optimal shower times

### Token Initialization

Run `npm run init-solana` to:
- Generate treasury wallet (`backend/treasury.json`)
- Request 2 SOL airdrop for treasury
- Create three token mints
- Mint 1,000,000 of each token to treasury
- Output mint addresses for `.env` file

### Nightly Batch Update (`backend/utils/solanaBatchUpdate.js`)

**Process**: Runs nightly via `npm run nightly-sync`

1. Connects to Solana Devnet
2. Finds all users with showers from yesterday
3. For each user:
   - Mints SoapToken coins (based on `dailyScores[yesterday].soapTokenCoins`)
   - Mints CleanEnv coins (based on `dailyScores[yesterday].cleanEnvCoins`)
4. Updates Solana blockchain with token balances

**Note**: Coins are calculated and stored in MongoDB immediately, but only minted to Solana at night.

---

## Leaderboard System

### Current Implementation

The leaderboard ranks users by **MongoDB `totalPoints`** (not Solana token balances).

#### Backend (`backend/utils/leaderboardScores.js`)
- `getTopUsersByScore(topN)` - Get top N users sorted by `totalPoints`
- `getPodiumDataByScore()` - Get top 3 formatted for Podium component
- `getUserScore(walletAddress)` - Get a user's score

#### Frontend
- `useLeaderboard()` hook - Fetches top 3 for Podium
- `useFullLeaderboard(limit)` hook - Fetches top N for extended leaderboard
- Displays scores instead of token balances

### Data Flow

1. User completes shower → `POST /api/shower/complete`
2. Backend calculates points & coins → Updates MongoDB immediately
3. Leaderboard queries MongoDB → Ranks by `totalPoints`
4. Frontend displays scores → Updates every 30 seconds
5. Nightly sync → Mints tokens to Solana (doesn't affect leaderboard ranking)

---

## Authentication & Wallet Integration

### Wallet Adapter Setup

- **Provider**: `AppWalletProvider` wraps the application
- **Supported Wallets**: Phantom, Solflare, and other Solana wallets
- **Network**: Solana Devnet
- **Auto-connect**: Enabled (remembers wallet connection)

### Profile Page Flow

1. User clicks profile icon → `/profile`
2. If not connected: Shows `WalletMultiButton`
3. User connects wallet → System checks MongoDB for user
4. **New user**: Shows questionnaire → Saves profile
5. **Existing user**: Shows dashboard with stats

### API Integration

- Wallet address is used as the primary key in MongoDB
- All API endpoints require/accept `walletAddress` parameter
- Wallet connection state managed by `@solana/wallet-adapter-react`

---

## Data Flow Diagram

```
User Completes Shower
    ↓
POST /api/shower/complete
    ↓
Calculate Points & Coins (pointsCalculator.js)
    ↓
Update MongoDB Immediately:
  - Add to dailyScores[today]
  - Update totalPoints, totalShowers, etc.
    ↓
Frontend Leaderboard
  - Queries MongoDB /api/leaderboard/podium
  - Displays top 3 by totalPoints
    ↓
Nightly Batch Process (npm run nightly-sync)
    ↓
Mint Tokens to Solana:
  - SoapToken coins
  - CleanEnv coins
    ↓
Solana Blockchain Updated
(Does not affect leaderboard ranking)
```

---

## Key Files & Locations

### Backend

- `backend/models/User.js` - MongoDB User schema
- `backend/utils/pointsCalculator.js` - Points & coin calculation
- `backend/utils/leaderboardScores.js` - Leaderboard queries (MongoDB)
- `backend/utils/solanaBatchUpdate.js` - Nightly Solana sync
- `backend/routes/showerRoutes.js` - Shower recording API
- `backend/routes/leaderboardRoutes.js` - Leaderboard API
- `backend/routes/profileRoutes.js` - Profile management API
- `backend/scripts/initSolana.js` - Initialize Solana tokens
- `backend/scripts/nightlySync.js` - Nightly batch sync script

### Frontend

- `frontend/app/profile/page.tsx` - Profile/login page
- `frontend/hooks/useLeaderboard.ts` - Top 3 leaderboard hook
- `frontend/hooks/useFullLeaderboard.ts` - Extended leaderboard hook
- `frontend/components/Podium.tsx` - Top 3 display component
- `frontend/components/LeaderboardRow.tsx` - Leaderboard row component
- `frontend/components/AppWalletProvider.tsx` - Wallet adapter setup

---

## Environment Variables

### Backend (`.env`)

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/shower-app

# Solana
SOLANA_PRIVATE_KEY=<treasury_wallet_private_key_bs58>
SOAP_TOKEN_MINT_ADDRESS=<soap_token_mint_address>
CLEAN_ENV_MINT_ADDRESS=<clean_env_mint_address>
ICE_MINT_ADDRESS=<ice_mint_address>
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
```

---

## Scripts

- `npm run init-solana` - Initialize Solana treasury and tokens
- `npm run nightly-sync` - Run nightly batch update (sync MongoDB → Solana)
- `npm run server` - Start backend server
- `npm run dev` (frontend) - Start Next.js development server

---

## Current State & Notes

### What's Working

✅ MongoDB stores all user data and scores  
✅ Points calculation system (100 points per shower)  
✅ Coin distribution logic (CleanEnv & SoapToken)  
✅ Leaderboard ranks by MongoDB `totalPoints`  
✅ Real-time score updates in MongoDB  
✅ Wallet authentication and profile management  
✅ Shower recording API  

### What's Pending

⏳ Nightly Solana sync (needs to be scheduled/cron job)  
⏳ Token balances on Solana are not used for leaderboard (by design)  
⏳ Frontend shower recording UI (API exists, UI needed)  

### Design Decisions

1. **MongoDB-first approach**: All scoring happens in MongoDB for speed and reliability
2. **Solana as reward layer**: Tokens are minted nightly, not in real-time
3. **Leaderboard from MongoDB**: Rankings use `totalPoints`, not token balances
4. **Wallet as identity**: Solana wallet address is the primary key for users

---

## Future Enhancements

- Schedule nightly sync via cron job or cloud function
- Add frontend UI for shower recording
- Implement token balance display (separate from leaderboard)
- Add transaction history viewing
- Implement token transfer functionality
- Add quest/achievement system
- Implement streaks and daily challenges

---

*Last Updated: Based on current implementation as of latest changes*

