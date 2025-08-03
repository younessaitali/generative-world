#!/bin/bash

echo "🚀 Starting Generative World Explorer Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting without database services..."
    echo "   To enable database services, start Docker and run: pnpm db:start"
    echo ""
    echo "🔄 Starting Nuxt development server..."
    pnpm dev
    exit 0
fi

echo "🔄 Starting database services (PostgreSQL & Redis)..."
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose exec postgres pg_isready -U generative_world_user -d generative_world; do
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker compose exec redis redis-cli ping | grep -q PONG; do
    sleep 2
done

echo "✅ Redis is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
pnpm db:push

echo "✅ Database is set up and ready!"

# Start the development server
echo "🔄 Starting Nuxt development server..."
pnpm dev
