""""
Main progrma file for the shower-o-matic (NAME STILL IN PROGRESS)

runs on bootup, where it will start and stop a task to record data
once the user is done showering it will stop tasks and send data
"""

from smbus2 import SMBus
from bme280 import BME280
import time

from gpiozero import DistanceSensor
import time
import os
from collections import deque
import statistics
import subprocess



MAC_ADDR = "2C_76_00_CF_F2_1C"
CARD = f"bluez_card.{MAC_ADDR}"

TEMP_CALIBRATION = 2
TIME_THRESHOLD = 10# IN SECONDS
DISTANCE_WINDOW_SIZE = 10 # IN CENTIMETERS TUNE ACCORDINLY

distance_history = deque(maxlen=DISTANCE_WINDOW_SIZE)
audio_timer = 0.0
AUDIO_THRESHOLD = 60

os.environ['GPIOZERO_PIN_FACTORY'] = 'lgpio'

def ended_shower(bme280: BME280, start_time, ultrasonic: DistanceSensor) -> bool:
    passed_time = time.time() - start_time # current amount of time that has passed
    
    dist = ultrasonic.distance * 100 # distance
    if passed_time >= TIME_THRESHOLD and (check_distance() or check_audio() or check_humidity()): 
        # check if enough of time has passed and 
        return True
    else:
        return False

def check_audio() -> bool:
    current_time = time.time()
    if current_time - audio_timer >= AUDIO_THRESHOLD:
        audio_timer = current_time
        record_5_seconds("audio.wav")


    return False

def check_humidity() -> bool:
    return False

def check_distance() -> bool:
    return False


# --- RECORDING SECTION ---
def record_5_seconds(output_file):
    print(f"\nRecording 5 seconds to {output_file}...")
    
    # The command that worked for your AirPods
    cmd = [
        "arecord", 
        "-d", "5", 
        "-f", "S16_LE", 
        "-r", "16000", 
        "-c", "1", 
        "-vv", 
        output_file
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print("Done!")
    except Exception as e:
        print(f"Error recording: {e}")

def get_temperature_Humidity(bme280: BME280): 
    """
    Gets the temperature and humidity and returns them rounded to 2 decimals
    """
    try:
        temperature = round(bme280.get_temperature() - TEMP_CALIBRATION, 2)
        humidity = round(bme280.get_humidity(), 2)
        return temperature, humidity
    except:
        return 0, 0
    
def update_distance_history(ultrasonic: DistanceSensor):
    dist_cm = ultrasonic.distance * 100  # meters → cm
    distance_history.append(dist_cm)


def send_audio():
    return None

def send_data(d: dict):
    """
    Function which data is sent to laptop
    """
    return None


def main():

    # when started then record data (while you haven't left teh shower)
    start_time = time.time()
    ultrasonic = DistanceSensor(echo=24, trigger=23) # sensor
    d = {} # hashmap

    # 1. Switch AirPods to Headset/Mic mode
    subprocess.run(["pactl", "set-card-profile", CARD, "headset-head-unit"], capture_output=True)

    # 2. Open the Pi 4 Bluetooth hardware gate
    subprocess.run(["sudo", "hcitool", "cmd", "0x3F", "0x01C", "0x01", "0x02", "0x00", "0x01", "0x01"], capture_output=True)




    bus = SMBus(1)
    bme280 = BME280(i2c_dev=bus)
    while not ended_shower(bme280, start_time, ultrasonic):
        # TODO: send audio CLIP
        temp, humid = get_temperature_Humidity(bme280)
        update_distance_history(ultrasonic)
        if not d["temp"] and  not d["humid"]:
            d["temp"] = temp
            d["humid"] = humid
        else:
            if d["temp"] < temp:
                d["temp"] = temp
            if d["humid"] < humid:
                d["humid"] = humid
        time.sleep(500)
    end_time = time.time()
    d["time"] = end_time - start_time

    # data stuff (send it)
    send_data(d)
    
    # turn off
    os.system("sudo poweroff") # turns off after everything to save battery

if __name__ == "__main__":
    main()