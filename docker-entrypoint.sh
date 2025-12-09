#!/bin/sh
set -e

echo "Starting MalamBot..."

# Start Go microservice in background
echo "Starting Go microservice on port 8080..."
./microservice &
MICROSERVICE_PID=$!

# Wait for microservice to be ready
echo "Waiting for microservice to be ready..."
for i in $(seq 1 30); do
    if wget -q --spider http://localhost:8080/health 2>/dev/null; then
        echo "Microservice is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# Start Node.js bot
echo "Starting Discord bot..."
exec node dist/index.js
