#!/bin/bash
# Usage: ./deploy.sh "커밋 메시지"

MESSAGE=${1:-"update"}

echo "🔨 Building & deploying: $MESSAGE"

# 1. Git commit & push
git add .
git commit -m "$MESSAGE"
git push origin main

# 2. EAS Update
EXPO_TOKEN=cJFK6IpsvoBNeMkhu9_OdDJA_6GwFxPr_se6KleD npx eas-cli update \
  --branch main \
  --message "$MESSAGE" \
  --non-interactive

echo "✅ Done! Restart Expo Go to apply."
