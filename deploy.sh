#!/bin/bash
set -e

# ── LIBITEX Deploy Script ──
# Usage: ./deploy.sh [api|web|all|nginx|down|logs|status]

COMPONENT=${1:-all}

echo "=== LIBITEX Deploy ==="
echo "Composant: $COMPONENT"
echo ""

# Pull latest code
git pull origin main

# Check .env
if [ ! -f .env ] && [[ "$COMPONENT" != "nginx" && "$COMPONENT" != "status" && "$COMPONENT" != "logs" ]]; then
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
  nginx)
    echo ">> Installation des configs Nginx..."
    sudo cp infra/nginx/libitex-api.lunion-lab.com /etc/nginx/sites-available/
    sudo cp infra/nginx/libitex-pro.lunion-lab.com /etc/nginx/sites-available/
    sudo ln -sf /etc/nginx/sites-available/libitex-api.lunion-lab.com /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/libitex-pro.lunion-lab.com /etc/nginx/sites-enabled/
    echo ">> Test config Nginx..."
    sudo nginx -t
    echo ">> Reload Nginx..."
    sudo systemctl reload nginx
    echo ">> Generation SSL avec Certbot..."
    sudo certbot --nginx -d libitex-api.lunion-lab.com -d libitex-pro.lunion-lab.com --non-interactive --agree-tos -m andersonkouadio0118@gmail.com
    echo ">> Nginx OK"
    ;;
  down)
    docker compose -f docker-compose.prod.yml down
    ;;
  logs)
    docker compose -f docker-compose.prod.yml logs -f --tail=50 ${2:-}
    ;;
  status)
    docker compose -f docker-compose.prod.yml ps
    ;;
  *)
    echo "Usage: ./deploy.sh [api|web|all|nginx|down|logs|status]"
    exit 1
    ;;
esac

if [[ "$COMPONENT" == "all" || "$COMPONENT" == "api" || "$COMPONENT" == "web" ]]; then
  echo ""
  echo ">> Verification..."
  sleep 10
  docker compose -f docker-compose.prod.yml ps
  echo ""
  echo "=== Deploy termine ==="
  echo "Frontend : https://libitex-pro.lunion-lab.com"
  echo "API      : https://libitex-api.lunion-lab.com"
  echo "Swagger  : https://libitex-api.lunion-lab.com/docs"
fi
