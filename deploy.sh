#!/bin/bash
set -e

# ── LIBITEX Deploy Script ──
# Usage: ./deploy.sh [api|web|all]

COMPONENT=${1:-all}

echo "=== LIBITEX Deploy ==="
echo "Composant: $COMPONENT"
echo ""

# Pull latest code
git pull origin main

# Check .env exists
if [ ! -f .env ]; then
  echo "ERREUR: .env manquant. Copiez .env.example et configurez."
  exit 1
fi

case $COMPONENT in
  api)
    echo ">> Build API..."
    docker compose -f docker-compose.prod.yml build api
    echo ">> Restart API..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate api
    ;;
  web)
    echo ">> Build Frontend..."
    docker compose -f docker-compose.prod.yml build web
    echo ">> Restart Frontend..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate web
    ;;
  all)
    echo ">> Build all..."
    docker compose -f docker-compose.prod.yml build
    echo ">> Start all..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate
    ;;
  *)
    echo "Usage: ./deploy.sh [api|web|all]"
    exit 1
    ;;
esac

# Wait and verify
echo ""
echo ">> Verification..."
sleep 8
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Deploy termine ==="
