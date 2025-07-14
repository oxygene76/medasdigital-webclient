#!/bin/bash

echo “🌌 Setting up MedasDigital WebClient v0.9…”

# Check for required tools

command -v git >/dev/null 2>&1 || { echo “❌ Git is required but not installed.”; exit 1; }

# Check for Docker (recommended for daemon)

if command -v docker >/dev/null 2>&1; then
echo “🐳 Docker found - daemon ready for deployment”
echo “🚀 Run ‘docker-compose up -d’ to start with daemon”
else
echo “⚠️  Docker not found - basic functionality only”
echo “💡 Install Docker to enable full daemon integration”
fi

# Check for Node.js (optional for development)

if command -v node >/dev/null 2>&1; then
echo “📦 Installing development dependencies…”
npm install
else
echo “⚠️  Node.js not found - using basic setup”
fi

# Setup daemon connection

echo “🔧 Configuring daemon connection…”
echo “DAEMON_URL=http://localhost:8080” > .env
echo “MEDAS_RPC_URL=https://rpc.medas-digital.io:26657” >> .env
echo “MEDAS_API_URL=https://api.medas-digital.io:1317” >> .env

# Create local directories

echo “⚙️ Creating local configuration…”
mkdir -p assets/images
mkdir -p docs
mkdir -p logs

echo “🚀 Setup complete! Choose your start method:”
echo “”
echo “🌐 Basic (Web only):”
echo “  python -m http.server 8000”
echo “  # or”
echo “  npx live-server”
echo “”
echo “🚀 Full stack (with daemon):”
echo “  docker-compose up -d”
echo “”
echo “📖 See README.md for detailed usage instructions.”
echo “🌟 May the cosmos guide your research!”
