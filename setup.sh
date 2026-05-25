#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

mkdir -p .context/chrome-profile

echo "Ready. Run: npm run dev"
