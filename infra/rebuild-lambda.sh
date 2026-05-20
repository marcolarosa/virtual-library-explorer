#!/bin/bash
# Rebuilds Lambda handler and restarts SAM by killing it
# Called by nodemon when Lambda files change

npm run build

# Signal SAM to restart by killing it (dev.sh will detect and restart)
# Only kill if SAM_PID is set and the process exists
if [ -n "$SAM_PID" ] && kill -0 "$SAM_PID" 2>/dev/null; then
    kill "$SAM_PID" 2>/dev/null || true
fi
