@echo off
echo =========================================
echo  Starting STMS Backend and Frontend
echo =========================================

start "STMS Backend (NestJS :4000)" cmd /k "cd backend && npm run start:dev"
start "STMS Frontend (Next.js :3000)" cmd /k "cd frontend && npm run dev"

echo Both servers launched in separate windows!
