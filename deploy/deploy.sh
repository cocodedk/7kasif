#!/bin/bash
set -euo pipefail

echo "Deploying Hafte Kasif..."

cd /opt/hafte-kasif

git pull origin main

docker compose build
docker compose up -d

# Clean up old images
docker image prune -f

# Health check
echo "Waiting for app to start..."
sleep 3

if curl -sf http://localhost:3000 > /dev/null; then
  echo "Deployed successfully! App is healthy."
else
  echo "ERROR: Health check failed — app is not responding on port 3000."
  echo "Check logs with: docker compose logs app"
  exit 1
fi
