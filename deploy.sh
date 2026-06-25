#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== SeederLinux Deployment (Fastify + Prisma) ==="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please run: sudo bash install.sh"
    exit 1
fi

# Stop existing containers
echo "1. Stopping existing containers..."
docker compose down -v 2>/dev/null || true

# Generate Prisma client
echo "2. Generating Prisma Client..."
npx prisma generate 2>/dev/null || echo "  (Prisma generate skipped - will be done in container)"

# Build and start
echo "3. Building and starting services..."
docker compose up -d --build

# Wait for services
echo "4. Waiting for services to start (60s)..."
sleep 60

# Check status
echo ""
echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Health Checks ==="

# Check each service (only 3 containers)
for service in db api app; do
    container=$(docker compose ps -q $service 2>/dev/null | head -1)
    if [ -n "$container" ]; then
        status=$(docker inspect "$container" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        echo "$service: $status"
    fi
done

echo ""
echo "=== Recent Logs ==="
echo "--- API ---"
docker compose logs api --tail=10 2>/dev/null || true
echo ""
echo "--- APP ---"
docker compose logs app --tail=5 2>/dev/null || true

echo ""
echo "=== Endpoints ==="
echo "App:   http://localhost:3000"
echo "API:   http://localhost:3001/health"
echo "Setup: http://localhost:3000/setup"
echo ""
echo "Run 'docker compose logs -f' to follow all logs"
