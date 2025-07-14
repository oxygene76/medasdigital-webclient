@echo off
echo 🌌 Setting up MedasDigital WebClient v0.9…

REM Check for Git
git –version >nul 2>&1
if errorlevel 1 (
echo ❌ Git is required but not installed.
exit /b 1
)

REM Check for Docker
docker –version >nul 2>&1
if errorlevel 1 (
echo ⚠️  Docker not found - basic functionality only
echo 💡 Install Docker to enable full daemon integration
) else (
echo 🐳 Docker found - daemon ready for deployment
echo 🚀 Run ‘docker-compose up -d’ to start with daemon
)

REM Check for Node.js
node –version >nul 2>&1
if errorlevel 1 (
echo ⚠️  Node.js not found - using basic setup
) else (
echo 📦 Installing development dependencies…
npm install
)

REM Setup configuration
echo 🔧 Configuring daemon connection…
echo DAEMON_URL=http://localhost:8080 > .env
echo MEDAS_RPC_URL=https://rpc.medas-digital.io:26657 >> .env
echo MEDAS_API_URL=https://api.medas-digital.io:1317 >> .env

REM Create directories
echo ⚙️ Creating local configuration…
mkdir assets\images 2>nul
mkdir docs 2>nul
mkdir logs 2>nul

echo 🚀 Setup complete! Choose your start method:
echo.
echo 🌐 Basic (Web only):
echo   python -m http.server 8000
echo   # or
echo   npx live-server
echo.
echo 🚀 Full stack (with daemon):
echo   docker-compose up -d
echo.
echo 📖 See README.md for detailed usage instructions.
echo 🌟 May the cosmos guide your research!
pause
