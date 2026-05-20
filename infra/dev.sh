#!/bin/bash
set -e

# Library Explorer Proxy — Local Development
# Builds Lambda handler and starts SAM local API server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building Lambda handler..."
cd "$SCRIPT_DIR"
npm run build

echo "Generating CloudFormation template..."
npm run synth

# Create .env.test if it doesn't exist
ENV_TEST="$PROJECT_ROOT/.env.test"
if [ ! -f "$ENV_TEST" ]; then
    cat > "$ENV_TEST" << 'EOF'
# SAM local API endpoint
VITE_PROXY_URL=http://localhost:3000/proxy
EOF
fi

# Validate prerequisites
if ! command -v sam &> /dev/null; then
    echo "Error: 'sam' command not found. Install AWS SAM CLI first."
    exit 1
fi

TEMPLATE_FILE="$SCRIPT_DIR/cdk.out/LibraryExplorerProxyStack.template.json"
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: CloudFormation template not found at $TEMPLATE_FILE"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "Error: Docker daemon is not running."
    exit 1
fi

# Configure Docker socket for the OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    export DOCKER_HOST=unix://"$HOME/.docker/run/docker.sock"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    export DOCKER_HOST=unix:///var/run/docker.sock
fi

echo "Starting SAM local API server..."
echo "Endpoint: http://localhost:3000/proxy"
echo "Restart this script manually after making changes to Lambda handler"
echo ""

sam local start-api \
    --template "$TEMPLATE_FILE" \
    --port 3000 \
    --host 127.0.0.1
