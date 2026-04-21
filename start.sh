#!/bin/sh
set -e
PORT="${PORT:-8000}"
echo "Starting on port ${PORT}"
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT}"
