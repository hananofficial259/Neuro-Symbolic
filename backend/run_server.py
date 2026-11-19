import os
import sys
import uvicorn

# Ensure repository root is on sys.path so 'backend' package imports cleanly
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Neuro-Symbolic Foundry on {host}:{port}...")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)
