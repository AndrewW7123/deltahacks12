import os
os.environ['GPIOZERO_PIN_FACTORY'] = 'lgpio'

from gpiozero import DistanceSensor
import time

ultrasonic = DistanceSensor(echo=24, trigger=23)

while True:
	dist = ultrasonic.distance * 100
	print(dist, "cm")
	time.sleep(0.3)



