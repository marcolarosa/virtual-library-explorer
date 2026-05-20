#!/bin/bash
set -e

# Library Explorer Proxy — Local Development
# Builds Lambda handler and starts SAM local API server with hot-reload on handler changes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Building Lambda handler...${NC}"
cd "$SCRIPT_DIR"
npm run build

echo -e "${BLUE}🔧 Generating CloudFormation template...${NC}"
npm run synth

# Create .env.test if it doesn't exist
ENV_TEST="$PROJECT_ROOT/.env.test"
if [ ! -f "$ENV_TEST" ]; then
    echo -e "${YELLOW}📝 Creating .env.test...${NC}"
    cat > "$ENV_TEST" << 'EOF'
# SAM local API endpoint
VITE_PROXY_URL=http://localhost:3000/proxy
EOF
fi

echo -e "${GREEN}✅ Build complete${NC}"
echo ""
echo -e "${BLUE}🚀 Starting SAM local API server with auto-reload...${NC}"
echo -e "${YELLOW}Handler auto-reloads on changes to infra/lib/lambda/**/*.ts${NC}"
echo -e "${YELLOW}Endpoint: http://localhost:3000/proxy${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Point SAM to the correct Docker socket (macOS Docker Desktop stores it in home dir)
export DOCKER_HOST=unix://"$HOME/.docker/run/docker.sock"

# Cleanup function to kill both background processes on exit
cleanup() {
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $nodemon_pid $sam_pid 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start nodemon to watch Lambda files and trigger rebuilds
npx nodemon &
nodemon_pid=$!

# Start SAM with the CloudFormation template
sam local start-api \
    --template cdk.out/LibraryExplorerProxyStack.template.json \
    --port 3000 \
    --host 127.0.0.1 &
sam_pid=$!

# Wait for both processes (will exit on Ctrl+C via trap)
wait
