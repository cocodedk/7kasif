#!/bin/bash
set -e

echo "Deploying Hafte Kasif..."

cd /opt/hafte-kasif

git pull origin main

docker compose build
docker compose up -d

echo "Deployed successfully!"
