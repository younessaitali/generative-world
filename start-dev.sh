#!/bin/bash

echo "🚀 Starting Generative World Explorer Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting without Redis caching..."
    echo "   To enable Redis caching, start Docker and run: pnpm redis:start"
    echo ""
    echo "🔄 Starting Nuxt development server..."
    pnpm dev
    exit 0
fi

echo "🔄 Starting Redis container..."
docker compose up -d redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker compose exec redis redis-cli ping | grep -q PONG; do
    sleep 2
done

echo "✅ Redis is ready!"

# Start the development server
echo "🔄 Starting Nuxt development server..."
pnpm dev
