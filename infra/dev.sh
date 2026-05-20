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

# Prerequisite validation checks
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v sam &> /dev/null; then
    echo -e "${YELLOW}❌ Error: 'sam' command not found. Install AWS SAM CLI first.${NC}"
    exit 1
fi

TEMPLATE_FILE="$SCRIPT_DIR/cdk.out/LibraryExplorerProxyStack.template.json"
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${YELLOW}❌ Error: CloudFormation template not found at $TEMPLATE_FILE${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}❌ Error: Docker daemon is not running. Start Docker and try again.${NC}"
    exit 1
fi

# Configure Docker socket for the OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    export DOCKER_HOST=unix://"$HOME/.docker/run/docker.sock"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    export DOCKER_HOST=unix:///var/run/docker.sock
else
    echo -e "${YELLOW}⚠️  Warning: Unsupported OS type ($OSTYPE). Using default Docker socket.${NC}"
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Start nodemon to watch Lambda files and trigger rebuilds
npx nodemon &
nodemon_pid=$!

# Check if port 3000 is already in use
if command -v lsof &> /dev/null; then
    if lsof -i :3000 &> /dev/null; then
        echo -e "${YELLOW}❌ Error: Port 3000 is already in use. Stop the other process and try again.${NC}"
        kill $nodemon_pid 2>/dev/null || true
        exit 1
    fi
fi

# Start SAM with the CloudFormation template
sam local start-api \
    --template "$TEMPLATE_FILE" \
    --port 3000 \
    --host 127.0.0.1 &
sam_pid=$!

# Cleanup function to kill both background processes on exit
# This must be set AFTER both process IDs are captured to avoid race condition
cleanup() {
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $nodemon_pid $sam_pid 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for both processes (will exit on Ctrl+C via trap)
wait
