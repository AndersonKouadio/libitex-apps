#!/bin/bash
set -e

# ── LIBITEX Deploy Script ──
# Usage: ./deploy.sh [api|web|all]
#
# Sur le VPS :
#   cd /opt/libitex
#   ./deploy.sh all
#
# Premier deploiement :
#   git clone https://github.com/AndersonKouadio/libitex-apps.git /opt/libitex
#   cd /opt/libitex
#   cp .env.production.example .env
#   nano .env  # configurer DATABASE_URL, JWT secrets
#   ./deploy.sh all

COMPONENT=${1:-all}

echo "=== LIBITEX Deploy ==="
echo "Composant: $COMPONENT"
echo ""

# Pull latest code
git pull origin main

# Check .env
if [ ! -f .env ]; then
  echo "ERREUR: .env manquant."
  echo "  cp .env.production.example .env"
  echo "  nano .env"
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
    docker compose -f docker-compose.prod.yml up -d
    ;;
  down)
    echo ">> Stopping all..."
    docker compose -f docker-compose.prod.yml down
    ;;
  logs)
    docker compose -f docker-compose.prod.yml logs -f --tail=50
    ;;
  status)
    docker compose -f docker-compose.prod.yml ps
    ;;
  *)
    echo "Usage: ./deploy.sh [api|web|all|down|logs|status]"
    exit 1
    ;;
esac

# Verify (sauf pour logs/down)
if [[ "$COMPONENT" != "logs" && "$COMPONENT" != "down" ]]; then
  echo ""
  echo ">> Verification..."
  sleep 10
  docker compose -f docker-compose.prod.yml ps
  echo ""
  echo ">> Test API..."
  curl -sf http://localhost:3000/api/v1/auth/connexion -X POST -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1 && echo "API: OK (repond)" || echo "API: en demarrage..."
  echo ""
  echo "=== Deploy termine ==="
  echo "Frontend: http://$(hostname -I | awk '{print $1}')"
  echo "API:      http://$(hostname -I | awk '{print $1}')/api/v1"
  echo "Swagger:  http://$(hostname -I | awk '{print $1}')/docs"
fi
