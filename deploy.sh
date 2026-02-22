#!/bin/bash
# deploy.sh — deploy mission-control and alias both domains
set -e

echo "Deploying to production..."
DEPLOY_URL=$(npx vercel --prod 2>&1 | grep "Production:" | grep -oE 'https://[^ ]+')

echo "Deployed: $DEPLOY_URL"
echo "Aliasing home.lookandseen.com..."
npx vercel alias "$DEPLOY_URL" home.lookandseen.com

echo "✅ Both domains updated:"
echo "   mc.lookandseen.com   → $DEPLOY_URL"
echo "   home.lookandseen.com → $DEPLOY_URL"
