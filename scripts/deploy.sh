#!/bin/bash

echo “🚀 Deploying MedasDigital WebClient v0.9…”

# Validate environment

if [ ! -f “index.html” ]; then
echo “❌ index.html not found. Run from project root.”
exit 1
fi

if [ ! -f “package.json” ]; then
echo “❌ package.json not found. Run setup first.”
exit 1
fi

# Check git status

if [ -n “$(git status –porcelain)” ]; then
echo “⚠️  You have uncommitted changes. Commit them first.”
git status –short
exit 1
fi

# Build process (if needed)

echo “🔧 Preparing deployment…”

# GitHub Pages deployment

echo “📤 Deploying to GitHub Pages…”
git checkout gh-pages 2>/dev/null || git checkout -b gh-pages

# Copy files for deployment

cp index.html docs/ assets/ -r ./
git add .
git commit -m “
