#!/bin/bash
# Deploy RE8CH Any Site on Earth subproject to Cloudflare Pages
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROJECT_NAME="anysiteonearth"
WRANGLER_CMD=""

# Ensure wrangler is available
if command -v wrangler &> /dev/null; then
    WRANGLER_CMD="wrangler"
elif command -v npx &> /dev/null; then
    WRANGLER_CMD="npx wrangler"
else
    echo "Node/npm not found. Install Node.js first."
    exit 1
fi

# Ensure logged in
if ! $WRANGLER_CMD whoami &> /dev/null; then
    echo "Please login to Cloudflare first: wrangler login"
    exit 1
fi

# Build static export and normalize dist output
echo "Building..."
npm run build

if [ ! -d "dist" ]; then
    echo "Build failed — dist/ directory not found"
    exit 1
fi

echo "Deploying to Cloudflare Pages..."
$WRANGLER_CMD pages deploy dist --project-name="$PROJECT_NAME"

echo ""
echo "Done! Site: https://$PROJECT_NAME.pages.dev"
