#!/bin/bash

# Production worker startup script
# Handles environment validation, health checks, and graceful startup

set -e

echo "======================================"
echo "AI Video Pro - Worker Startup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check required environment variables
check_env_vars() {
  print_info "Checking required environment variables..."

  local required_vars=(
    "REDIS_URL"
    "DATABASE_URL"
    "BLOB_READ_WRITE_TOKEN"
    "ENCRYPTION_KEY"
  )

  local missing_vars=()

  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      missing_vars+=("$var")
    fi
  done

  if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
      echo "  - $var"
    done
    exit 1
  fi

  print_info "All required environment variables are set"
}

# Check Redis connectivity
check_redis() {
  print_info "Checking Redis connectivity..."

  # Extract host and port from REDIS_URL
  # Format: redis://host:port or redis://user:pass@host:port
  local redis_host=$(echo $REDIS_URL | sed -E 's|redis://([^:@]+:[^@]+@)?([^:]+):.*|\2|')
  local redis_port=$(echo $REDIS_URL | sed -E 's|redis://.*:([0-9]+).*|\1|')

  # Default to localhost:6379 if parsing fails
  redis_host=${redis_host:-localhost}
  redis_port=${redis_port:-6379}

  print_info "Redis host: $redis_host:$redis_port"

  # Wait for Redis to be ready (max 30 seconds)
  local max_attempts=30
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if command -v redis-cli &> /dev/null; then
      if redis-cli -h "$redis_host" -p "$redis_port" ping &> /dev/null; then
        print_info "Redis is ready"
        return 0
      fi
    else
      # If redis-cli is not available, try using Node.js
      if node -e "
        const Redis = require('ioredis');
        const redis = new Redis('$REDIS_URL');
        redis.ping().then(() => {
          redis.quit();
          process.exit(0);
        }).catch(() => {
          redis.quit();
          process.exit(1);
        });
      " &> /dev/null; then
        print_info "Redis is ready"
        return 0
      fi
    fi

    print_warn "Waiting for Redis... (attempt $attempt/$max_attempts)"
    sleep 1
    ((attempt++))
  done

  print_error "Redis is not ready after $max_attempts seconds"
  exit 1
}

# Build worker if needed
build_worker() {
  if [ ! -d "dist/workers" ]; then
    print_info "Building worker..."
    npm run worker:build
    print_info "Worker built successfully"
  else
    print_info "Worker already built (dist/workers exists)"
  fi
}

# Run health check
run_health_check() {
  print_info "Running health check..."

  if [ "$NODE_ENV" = "production" ]; then
    if node dist/workers/health-check.js &> /dev/null; then
      print_info "Health check passed"
    else
      print_warn "Health check failed"
      exit 1
    fi
  else
    if npx tsx workers/health-check.ts &> /dev/null; then
      print_info "Health check passed"
    else
      print_warn "Health check failed, but continuing anyway"
    fi
  fi
}

# Cleanup on exit
cleanup() {
  print_info "Shutting down worker..."
  # Kill child processes
  pkill -P $$ || true
  print_info "Worker stopped"
}

# Register cleanup handler
trap cleanup EXIT INT TERM

# Main execution
main() {
  print_info "Starting worker initialization..."

  # Run checks
  check_env_vars
  check_redis

  # Build if production
  if [ "$NODE_ENV" = "production" ]; then
    build_worker
  fi

  # Set default log level if not set
  export LOG_LEVEL=${LOG_LEVEL:-info}

  print_info "Worker configuration:"
  echo "  - Node environment: ${NODE_ENV:-development}"
  echo "  - Log level: $LOG_LEVEL"
  echo "  - Redis URL: $REDIS_URL"
  echo ""

  print_info "Starting video generation worker..."
  echo ""

  # Start worker
  if [ "$NODE_ENV" = "production" ]; then
    # Production: Run built worker
    exec node dist/workers/video-generation-worker.js
  else
    # Development: Use tsx for hot reload
    exec npx tsx watch workers/video-generation-worker.ts
  fi
}

# Run main function
main
