import time
import os
os.environ['GPIOZERO_PIN_FACTORY'] = 'lgpio'

from gpiozero import DistanceSensor
from smbus2 import SMBus
from bme280 import BME280
import subprocess
import csv


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


count = 0
tracker = 0
distance_storage = []
stop_counter = 0
time_total = 1

start_time = time.time()

import csv
import os

# --- Before the loop ---
csv_file = "live_shower_data.csv"
headers = ["timestamp", "temp", "humidity", "distance", "status"]

# Create the file and write headers if it doesn't exist

if not os.path.exists(csv_file):
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

with open(csv_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(headers)

while True:
    dist = ultrasonic.distance * 100
    temperature = bme280.get_temperature() - 2
    hum = bme280.get_humidity()
    
    # status is "active" while in the loop
    status = "running" 
    
    # 1. Print to console
    print(f"Temp: {temperature:0.2f}C | Hum: {hum:0.2f}% | Distance: {dist:0.2f} | Elapsed Time: {time_total}")

    # 2. Append to CSV immediately
    with open(csv_file, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            time.strftime("%Y-%m-%d %H:%M:%S"),
            time_total, 
            round(temperature, 2), 
            round(hum, 2), 
            round(dist, 2), 
            status
        ])

    # --- Your existing logic ---
    count += 1
    if count == 30:
        count = 0 # Don't forget to reset count!
        tracker += 1
        time_total += 5
        record_5_seconds(f"audio{tracker}.wav")
        
    if round(dist, 2) == 100.00:
        stop_counter += 1
    else:
        stop_counter = 0
    
    if stop_counter >= 25:
        # Update one last time to say it's stopped
        with open(csv_file, 'a', newline='') as f:
            csv.writer(f).writerow([time.strftime("%Y-%m-%d %H:%M:%S"), time_total, "-", "-", "STOPPED"])
        
        print("No Human detected. Stopping...")
        break
        
    time.sleep(1.0)
    time_total += 1
    
        
        
