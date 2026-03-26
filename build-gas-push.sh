#!/bin/bash
set -e

echo "=== Building GAS bundle ==="
npx vite build --config vite.gas.config.ts

echo "=== Copying to deployment folder ==="
cp dist/gas/index.html projects/battle-library/gas/index.html

echo "=== Bundle size ==="
wc -c projects/battle-library/gas/index.html

echo "=== Committing and pushing ==="
git add projects/battle-library/gas/index.html
git commit -m "build: GAS bundle"
git push origin main

echo "=== Done! Deploy with: npm run sync-ui -- battle-library ==="
