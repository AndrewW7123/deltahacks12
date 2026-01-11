import time
import os
os.environ['GPIOZERO_PIN_FACTORY'] = 'lgpio'

from gpiozero import DistanceSensor
from smbus2 import SMBus
from bme280 import BME280
import subprocess
import requests

bus = SMBus(1)
bme280 = BME280(i2c_dev=bus)
ultrasonic = DistanceSensor(echo=24, trigger=23)

MAC_ADDR = "2C_76_00_CF_F2_1C"
CARD = f"bluez_card.{MAC_ADDR}"

print("Setting up hardware...")

# 1. Switch AirPods to Headset/Mic mode
subprocess.run(["pactl", "set-card-profile", CARD, "headset-head-unit"], capture_output=True)

# 2. Open the Pi 4 Bluetooth hardware gate
subprocess.run(["sudo", "hcitool", "cmd", "0x3F", "0x01C", "0x01", "0x02", "0x00", "0x01", "0x01"], capture_output=True)

print("Mic Setup")


def test_backend_connection():
    """
    Test connection to backend at startup
    """
    RYAN_WALLET = "4nkeeh7vK9J8mN3pQ2rT5wXyZ1aB6cD4eF8gH0iJ2kL9mN1oP3qR5sT7uV9wXfbz6"
    API_URL = "http://localhost:3001/api/shower/hardware-input"
    
    print("\n🔌 Testing backend connection...")
    try:
        # Test with minimal data
        test_payload = {
            "walletAddress": RYAN_WALLET,
            "actualTime": 1,
            "actualTemp": 20
        }
        response = requests.post(API_URL, json=test_payload, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Backend connection successful!")
                print(f"   Backend is ready to receive shower data")
                return True
            else:
                print(f"⚠️  Backend responded but returned error: {data.get('error', 'Unknown')}")
                return False
        else:
            print(f"⚠️  Backend responded with status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to backend at {API_URL}")
        print("   Make sure backend server is running: npm run dev")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ Backend connection timeout (server may be slow)")
        return False
    except Exception as e:
        print(f"❌ Connection test error: {type(e).__name__}: {e}")
        return False


def record_5_seconds(filename):
    # 1. Define the folder name
    folder = "audio"
    
    # 2. Create the folder if it doesn't exist yet
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"Created folder: {folder}")

    # 3. Join the folder and filename (creates "audio/audio.wav")
    filepath = os.path.join(folder, filename)
    
    print(f"\nRecording 5 seconds to {filepath}...")
    
    cmd = [
        "arecord", 
        "-d", "5", 
        "-f", "S16_LE", 
        "-r", "16000", 
        "-c", "1", 
        "-vv", 
        filepath  # Use the full path here
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print("Done!")
    except Exception as e:
        print(f"Error recording: {e}")

def send_sensor_data(hum, temp, time_count, status, audio_path=None):
    """
    Send sensor data to backend API when shower ends
    Updates Ryan Chang's shower count and coins
    """
    # Ryan Chang's wallet address
    RYAN_WALLET = "4nkeeh7vK9J8mN3pQ2rT5wXyZ1aB6cD4eF8gH0iJ2kL9mN1oP3qR5sT7uV9wXfbz6"
    
    # Backend API URL - update this to match your backend server
    API_URL = "http://localhost:3001/api/shower/hardware-input"
    
    if status == "stopped" and time_count > 0:
        print(f"\n{'='*50}")
        print(f"📤 SENDING SHOWER DATA TO BACKEND")
        print(f"{'='*50}")
        print(f"   Time: {time_count}s ({time_count/60:.1f} min)")
        print(f"   Temperature: {temp:.1f}°C")
        print(f"   Wallet: {RYAN_WALLET[:8]}...{RYAN_WALLET[-4:]}")
        print(f"   API: {API_URL}")
        
        try:
            # Prepare data for backend
            payload = {
                "walletAddress": RYAN_WALLET,
                "actualTime": int(time_count),  # Ensure integer
                "actualTemp": float(temp)  # Ensure float
            }
            
            print(f"\n📡 Connecting to backend...")
            response = requests.post(API_URL, json=payload, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print(f"\n✅ SHOWER DATA SENT SUCCESSFULLY!")
                    print(f"   Points earned: {data['data']['points']}")
                    print(f"   CleanEnv Coins: {data['data']['cleanEnvCoins']}")
                    print(f"   SoapToken Coins: {data['data']['soapTokenCoins']}")
                    
                    # Show blockchain status
                    blockchain_status = data['data']['blockchainSync']['status']
                    if blockchain_status == 'synced':
                        print(f"   ✅ Tokens minted to blockchain")
                        if data['data']['blockchainSync'].get('soapTokenTx'):
                            print(f"      SoapToken TX: {data['data']['blockchainSync']['soapTokenTx'][:16]}...")
                        if data['data']['blockchainSync'].get('cleanEnvTx'):
                            print(f"      CleanEnv TX: {data['data']['blockchainSync']['cleanEnvTx'][:16]}...")
                    else:
                        print(f"   ⚠️  Blockchain sync: {blockchain_status}")
                        if data['data']['blockchainSync'].get('error'):
                            print(f"      Error: {data['data']['blockchainSync']['error']}")
                    
                    # Show updated totals
                    lifetime = data['data']['lifetimeTotal']
                    print(f"\n📊 Updated Totals:")
                    print(f"   Lifetime Points: {lifetime['points']}")
                    print(f"   Total Showers: {lifetime['showers']}")
                    print(f"   Total CleanEnv Coins: {lifetime['cleanEnvCoins']}")
                    print(f"   Total SoapToken Coins: {lifetime['soapTokenCoins']}")
                    print(f"{'='*50}\n")
                    return True
                else:
                    print(f"\n❌ Backend returned error:")
                    print(f"   {data.get('error', 'Unknown error')}")
                    if 'message' in data:
                        print(f"   Message: {data['message']}")
                    print(f"{'='*50}\n")
                    return False
            else:
                print(f"\n❌ Backend request failed!")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                print(f"{'='*50}\n")
                return False
        except requests.exceptions.ConnectionError as e:
            print(f"\n❌ CONNECTION FAILED!")
            print(f"   Cannot reach backend at {API_URL}")
            print(f"   Error: {e}")
            print(f"   Make sure backend server is running: npm run dev")
            print(f"{'='*50}\n")
            return False
        except requests.exceptions.Timeout:
            print(f"\n❌ REQUEST TIMEOUT!")
            print(f"   Backend did not respond within 30 seconds")
            print(f"   Check if backend is running and accessible")
            print(f"{'='*50}\n")
            return False
        except requests.exceptions.RequestException as e:
            print(f"\n❌ REQUEST ERROR!")
            print(f"   {type(e).__name__}: {e}")
            print(f"{'='*50}\n")
            return False
        except Exception as e:
            print(f"\n❌ UNEXPECTED ERROR!")
            print(f"   {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            print(f"{'='*50}\n")
            return False
    else:
        print(f"\n⚠️  Skipping send - status: {status}, time: {time_count}")
        return False

# Test backend connection at startup
backend_connected = test_backend_connection()
if not backend_connected:
    print("\n⚠️  WARNING: Backend connection test failed!")
    print("   Shower data will not be saved until connection is established.")
    print("   Make sure backend is running: npm run dev\n")
else:
    print("   Ready to record showers!\n")

# Initialize sensor tracking variables
count = 0
tracker = 0
distance_storage = []
stop_counter = 0
time_total = 1
max_temp = 0

# Main sensor loop
print("Starting sensor monitoring loop...")
print("Waiting for shower to start...\n")

while stop_counter <= 25:
    dist = ultrasonic.distance * 100
    temperature = bme280.get_temperature() - 2
    hum = bme280.get_humidity()
    
    if temperature > max_temp:
        max_temp = temperature

    status = "running" 
    
    #Printing Hum, Temp, Distance Out
    print(f"Max temp: {max_temp:0.2f}C | Hum: {hum:0.2f}% | Distance: {dist:0.2f} | Elapsed Time: {time_total}")

    ##Checking if Audio is Recorded 
    count += 1
    if count == 30:
        count = 0 
        tracker += 1
        time_total += 5
        record_5_seconds(f"audio{tracker}.wav")

    ##Checking if Distance is recorded  
    if round(dist, 2) == 100.00:
        stop_counter += 1
    else:
        stop_counter = 0
    
    if stop_counter == 25:
        print("No Human detected. Stopping...")
        status = "stopped"
        # Send final shower data to backend
        send_sensor_data(hum, max_temp, time_total, status)

    time.sleep(1.0)
    time_total += 1
    
        
        

    
        
        
