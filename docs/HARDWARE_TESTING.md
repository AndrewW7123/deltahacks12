# Hardware Connection Testing Guide

## Quick Test

Run the test script to verify hardware connection:

```bash
npm run test-hardware
```

This will:
1. ✅ Verify Ryan Chang exists in MongoDB
2. ✅ Send a test shower to `/api/shower/hardware-input`
3. ✅ Update Ryan Chang's points, showers, and coins
4. ✅ Show blockchain sync status

## Hardware Integration

The hardware code (`hardware/main.py`) is now configured to:

1. **Track shower data**:
   - Time: Total seconds from sensor loop
   - Temperature: Maximum temperature recorded
   - Status: "running" or "stopped"

2. **Send to backend** when shower ends:
   - Endpoint: `POST http://localhost:3001/api/shower/hardware-input`
   - Wallet: Ryan Chang's wallet (`4nkeeh...fbz6`)
   - Data: `{ walletAddress, actualTime, actualTemp }`

3. **Backend updates**:
   - MongoDB: Points and coins updated immediately
   - Solana: Tokens minted immediately (if SOLANA_PRIVATE_KEY is set)
   - Transaction signatures stored in MongoDB

## Testing Steps

### 1. Start Backend Server
```bash
npm run dev
```

### 2. Run Test Script
```bash
npm run test-hardware
```

### 3. Verify Results
- Check MongoDB: Ryan Chang should have updated points/showers
- Check leaderboard: Ryan Chang should appear if points > 0
- Check profile: Shower and coin counters should update

## Hardware Configuration

Update `API_URL` in `hardware/main.py` if your backend is on a different host:

```python
API_URL = "http://YOUR_BACKEND_IP:3001/api/shower/hardware-input"
```

## Expected Response

```json
{
  "success": true,
  "data": {
    "points": 56,
    "cleanEnvCoins": 0,
    "soapTokenCoins": 0,
    "blockchainSync": {
      "status": "synced" | "manual_sync_required",
      "soapTokenTx": "transaction_signature",
      "cleanEnvTx": "transaction_signature"
    },
    "lifetimeTotal": {
      "points": 56,
      "showers": 1,
      "cleanEnvCoins": 0,
      "soapTokenCoins": 0
    }
  }
}
```
