#!/bin/bash
# Rebuilds Lambda handler and restarts SAM by killing it
# Called by nodemon when Lambda files change

npm run build

# Kill SAM by process name so dev.sh loop detects and restarts it
# This is more reliable than using $SAM_PID which may not propagate through nodemon
pkill -f "sam local start-api" 2>/dev/null || true
