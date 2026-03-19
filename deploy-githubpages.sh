#!/bin/bash
set -euo pipefail

cleanup() {
    echo "Deploy failed at line $1"
}
trap 'cleanup $LINENO' ERR

echo "Switching to master..."
git checkout master

echo "Pulling latest changes..."
git pull origin master

echo "Building site..."
npm run build

echo "Deploying to GitHub Pages..."
USE_SSH=true npm run deploy

echo "Deploy complete!"
