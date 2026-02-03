#!/bin/bash

echo "🎮 SD-RP Broadcast Dashboard - Starte..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installiere Dependencies..."
    npm install
fi

echo "🔨 Erstelle Production Build..."
npm run build

echo ""
echo "🚀 Starte Server..."
echo "✅ Dashboard verfügbar auf: http://localhost:3000"
echo ""

npm run server
