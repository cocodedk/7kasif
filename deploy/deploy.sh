#!/bin/bash
set -euo pipefail

echo "Deploying Hafte Kasif..."

# Wait for any running apt processes to finish
while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  echo "Waiting for apt lock..."
  sleep 5
done

# Update system packages
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

cd /opt/7kasif

git pull origin main

docker compose build
docker compose up -d

# Clean up old images
docker image prune -f

# Health check
echo "Waiting for app to start..."
sleep 10

if curl -sf http://localhost:3000 > /dev/null; then
  echo "Deployed successfully! App is healthy."
else
  echo "ERROR: Health check failed — app is not responding on port 3000."
  echo "Check logs with: docker compose logs app"
  exit 1
fi
