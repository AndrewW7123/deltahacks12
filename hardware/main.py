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
        try:
            # Prepare data for backend
            payload = {
                "walletAddress": RYAN_WALLET,
                "actualTime": time_count,  # Total time in seconds
                "actualTemp": temp  # Temperature in Celsius
            }
            
            print(f"\n📤 Sending shower data to backend...")
            print(f"   Time: {time_count}s ({time_count/60:.1f} min)")
            print(f"   Temperature: {temp:.1f}°C")
            
            response = requests.post(API_URL, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print(f"✅ Shower data sent successfully!")
                    print(f"   Points: {data['data']['points']}")
                    print(f"   CleanEnv Coins: {data['data']['cleanEnvCoins']}")
                    print(f"   SoapToken Coins: {data['data']['soapTokenCoins']}")
                    if data['data']['blockchainSync']['status'] == 'synced':
                        print(f"   ✅ Tokens minted to blockchain")
                    else:
                        print(f"   ⚠️  Blockchain sync: {data['data']['blockchainSync']['status']}")
                else:
                    print(f"❌ Backend returned error: {data.get('error', 'Unknown error')}")
            else:
                print(f"❌ Backend request failed: {response.status_code}")
                print(f"   {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to connect to backend: {e}")
            print(f"   Make sure backend server is running at {API_URL}")
        except Exception as e:
            print(f"❌ Error sending data: {e}")

count = 0
tracker = 0
distance_storage = []
stop_counter = 0
time_total = 1
max_temp = 0

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
    
        
        

    
        
        
