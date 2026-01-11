#!/usr/bin/env python3
"""
Test script to verify backend connection
Run this before starting the main hardware script to ensure backend is accessible
"""

import requests
import sys

RYAN_WALLET = "4nkeeh7vK9J8mN3pQ2rT5wXyZ1aB6cD4eF8gH0iJ2kL9mN1oP3qR5sT7uV9wXfbz6"
API_URL = "http://localhost:3001/api/shower/hardware-input"

def test_backend():
    print("=" * 60)
    print("🧪 BACKEND CONNECTION TEST")
    print("=" * 60)
    print(f"\nTesting connection to: {API_URL}")
    print(f"Wallet: {RYAN_WALLET[:8]}...{RYAN_WALLET[-4:]}\n")
    
    # Test 1: Basic connection
    print("Test 1: Basic Connection Test")
    print("-" * 60)
    try:
        test_payload = {
            "walletAddress": RYAN_WALLET,
            "actualTime": 300,  # 5 minutes
            "actualTemp": 38.0  # 38°C
        }
        
        print(f"📤 Sending test payload...")
        print(f"   Time: {test_payload['actualTime']}s ({test_payload['actualTime']/60:.1f} min)")
        print(f"   Temperature: {test_payload['actualTemp']}°C")
        
        response = requests.post(API_URL, json=test_payload, timeout=10)
        
        print(f"\n📥 Response received:")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                print(f"\n✅ SUCCESS! Backend is working correctly!")
                print(f"\n📊 Response Data:")
                print(f"   Points: {data['data']['points']}")
                print(f"   CleanEnv Coins: {data['data']['cleanEnvCoins']}")
                print(f"   SoapToken Coins: {data['data']['soapTokenCoins']}")
                
                blockchain = data['data']['blockchainSync']
                print(f"\n🔗 Blockchain Status:")
                print(f"   Status: {blockchain['status']}")
                if blockchain.get('soapTokenTx'):
                    print(f"   SoapToken TX: {blockchain['soapTokenTx'][:20]}...")
                if blockchain.get('cleanEnvTx'):
                    print(f"   CleanEnv TX: {blockchain['cleanEnvTx'][:20]}...")
                if blockchain.get('error'):
                    print(f"   ⚠️  Error: {blockchain['error']}")
                
                lifetime = data['data']['lifetimeTotal']
                print(f"\n📈 Lifetime Totals:")
                print(f"   Points: {lifetime['points']}")
                print(f"   Showers: {lifetime['showers']}")
                print(f"   CleanEnv Coins: {lifetime['cleanEnvCoins']}")
                print(f"   SoapToken Coins: {lifetime['soapTokenCoins']}")
                
                print("\n" + "=" * 60)
                print("✅ ALL TESTS PASSED - Backend is ready!")
                print("=" * 60)
                return True
            else:
                print(f"\n❌ Backend returned success: false")
                print(f"   Error: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"\n❌ Backend returned error status: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"\n❌ CONNECTION FAILED!")
        print(f"   Cannot reach backend at {API_URL}")
        print(f"   Make sure backend server is running:")
        print(f"      cd backend && npm run dev")
        return False
    except requests.exceptions.Timeout:
        print(f"\n❌ REQUEST TIMEOUT!")
        print(f"   Backend did not respond within 10 seconds")
        print(f"   Server may be slow or unresponsive")
        return False
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR!")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_backend()
    sys.exit(0 if success else 1)
