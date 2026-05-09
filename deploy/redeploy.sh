#!/bin/bash
# Redeploy BurgerCity: install deps if changed, build frontend, restart service.
# Aufruf: bash /root/Joshua/BurgerCity/deploy/redeploy.sh
set -e
cd /root/Joshua/BurgerCity

echo "→ npm install (frontend + server)"
npm install --silent
npm --prefix server install --silent

echo "→ vite build"
npm run build --silent

echo "→ systemctl restart burgercity"
systemctl restart burgercity

echo "→ Status:"
systemctl status burgercity --no-pager | head -6

echo
echo "✓ Deployed: https://burgercity.seiz.ing"
