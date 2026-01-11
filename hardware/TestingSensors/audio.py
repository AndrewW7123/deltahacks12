import subprocess

# --- SETUP SECTION (Runs once) ---
# Your specific AirPods MAC address
MAC_ADDR = "2C_76_00_CF_F2_1C"
CARD = f"bluez_card.{MAC_ADDR}"

print("Setting up hardware...")

# 1. Switch AirPods to Headset/Mic mode
subprocess.run(["pactl", "set-card-profile", CARD, "headset-head-unit"], capture_output=True)

# 2. Open the Pi 4 Bluetooth hardware gate
subprocess.run(["sudo", "hcitool", "cmd", "0x3F", "0x01C", "0x01", "0x02", "0x00", "0x01", "0x01"], capture_output=True)

print("Setup complete. AirPods are ready.")


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

record_5_seconds("test.wav")
