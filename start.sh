#!/usr/bin/env bash

# Function to kill all child background processes on CTRL+C
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "========================================="
echo " Starting STMS Backend and Frontend Servers"
echo "========================================="

# Start Backend API
echo "Starting Backend (NestJS on port 4000)..."
(cd backend && npm run start:dev) &

# Start Frontend App
echo "Starting Frontend (Next.js on port 3000)..."
(cd frontend && npm run dev) &

# Keep script running and wait for child processes
wait
