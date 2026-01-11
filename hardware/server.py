from fastapi import FastAPI
import subprocess
import os

app = FastAPI()
SCRIPT_PATH = "/home/deltahacks/Programming/deltahacks12/hardware/main.py"

running_processes = {}


@app.post("/run-sensors")
async def trigger_file():
    if not os.path.exists(SCRIPT_PATH):
        return {"error": "File not found", "path": SCRIPT_PATH}
        
    if "main_script" in running_processes and running_processes["main_script"].poll() is None:
        return {"status": "Already running", "pid": running_processes["main_script"].pid}

    try:
        process = subprocess.Popen(
            ["python3", SCRIPT_PATH],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        return {
            "status": "Started",
            "message": f"Executing {os.path.basename(SCRIPT_PATH)}",
            "pid": process.pid
        }
        
        running_processes["main_script"] = process

    except Exception as e:
        return {"status": "failed", "error": str(e)}


@app.post("/stop-sensors")
async def stop_sensors():
    process = running_processes.get("main_script")

    # 1. Check if the process exists and is actually running
    if process and process.poll() is None:
        try:
            # 2. Send the terminate signal (like pressing Ctrl+C)
            os.kill(process.pid, signal.SIGTERM)
            return {"status": "Stopped", "pid": process.pid}
        except Exception as e:
            return {"error": f"Failed to kill process: {str(e)}"}
    
    return {"status": "Error", "message": "No sensors are currently running."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
