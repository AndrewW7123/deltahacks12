from fastapi import FastAPI
import subprocess
import os

app = FastAPI()
SCRIPT_PATH = "/home/deltahacks/Programming/deltahacks12/hardware/main.py"

@app.post("/run-sensors")
async def trigger_file():
    if not os.path.exists(SCRIPT_PATH):
        return {"error": "File not found", "path": SCRIPT_PATH}

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
    except Exception as e:
        return {"status": "failed", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
