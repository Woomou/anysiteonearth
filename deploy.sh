#!/bin/bash
# Deploy Any Site on Earth to Cloudflare Pages
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROJECT_NAME="anysiteonearth"

# Ensure wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Ensure logged in
if ! wrangler whoami &> /dev/null; then
    echo "Please login to Cloudflare first: wrangler login"
    exit 1
fi

# Build static export
echo "Building..."
npm run build

if [ ! -d "out" ]; then
    echo "Build failed — out/ directory not found"
    exit 1
fi

echo "Deploying to Cloudflare Pages..."
wrangler pages deploy out --project-name="$PROJECT_NAME"

echo ""
echo "Done! Site: https://$PROJECT_NAME.pages.dev"
