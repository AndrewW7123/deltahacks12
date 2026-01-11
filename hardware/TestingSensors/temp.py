import time
from smbus2 import SMBus
from bme280 import BME280

bus = SMBus(1)
bme280 = BME280(i2c_dev=bus)

print("Reading data from Multi-Sensor Stick...")

try:
    while True:
        temperature = bme280.get_temperature() - 2
        hum = bme280.get_humidity()
        
        print(f"Temp: {temperature:0.2f}°C | Hum: {hum:0.2f}%")
        time.sleep(1.0)
        
except KeyboardInterrupt:
    print("\nScript stopped.")
