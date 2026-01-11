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

TEMP_CALIBRATION = 2
TIME_THRESHOLD = 10# IN SECONDS
DISTANCE_WINDOW_SIZE = 10 # IN CENTIMETERS TUNE ACCORDINLY

distance_history = deque(maxlen=DISTANCE_WINDOW_SIZE)

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
    return False

def check_humidity() -> bool:
    return False

def check_distance() -> bool:
    return False

def user_start():
    """
    some loops that gets when the user tells toe start from laptop
    """
    while True:
        print("waiting for user to start")


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
    # check if user start
    user_start()

    # when started then record data (while you haven't left teh shower)
    start_time = time.time()
    ultrasonic = DistanceSensor(echo=24, trigger=23) # sensor
    d = {} # hashmap

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