#!/bin/bash
set -e

# ── LIBITEX Deploy Script ──
# Usage: ./deploy.sh [api|web|all|nginx|db|down|logs|status]

COMPONENT=${1:-all}

echo "=== LIBITEX Deploy ==="
echo "Composant: $COMPONENT"
echo ""

# Pull latest code, et redemarre le script si lui-meme a change. Sans ce
# re-exec, bash continue avec la version en memoire (ancien code) bien que
# le fichier sur disque soit a jour.
PRE_HASH=$(sha256sum "$0" | awk '{print $1}')
git pull origin main
POST_HASH=$(sha256sum "$0" | awk '{print $1}')
if [ "$PRE_HASH" != "$POST_HASH" ] && [ -z "${LIBITEX_DEPLOY_REEXEC:-}" ]; then
  echo ">> deploy.sh a change, redemarrage avec la version a jour..."
  export LIBITEX_DEPLOY_REEXEC=1
  exec "$0" "$@"
fi

# Check .env
if [ ! -f .env ] && [[ "$COMPONENT" != "nginx" && "$COMPONENT" != "status" && "$COMPONENT" != "logs" ]]; then
  echo "ERREUR: .env manquant."
  echo "  cp .env.production.example .env"
  echo "  nano .env"
  exit 1
fi

# Pousse le schema Drizzle vers la base (Neon). A appeler apres chaque deploy
# api/all ou en standalone via './deploy.sh db'. Idempotent : ne fait rien si
# le schema est deja a jour.
#
# Tourne dans un container Node ephemere : pas besoin de Node/pnpm sur l'host
# (utile en CI/CD ou en SSH non-interactif ou le PATH est minimal).
push_schema() {
  echo ">> Push du schema Drizzle vers la base (container Node)..."
  # Extrait DATABASE_URL via grep (et non par sourcing) car le caractere & dans
  # une URL Neon non-quotee est interprete comme operateur de fork bash.
  local db_url
  db_url=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
  db_url="${db_url%\"}"
  db_url="${db_url#\"}"
  db_url="${db_url%\'}"
  db_url="${db_url#\'}"
  if [ -z "$db_url" ]; then
    echo "ERREUR: DATABASE_URL absent du .env"
    exit 1
  fi
  docker run --rm \
    -v "$(pwd):/app" \
    -w /app/packages/db \
    -e DATABASE_URL="$db_url" \
    node:20-alpine \
    sh -c "corepack enable pnpm >/dev/null 2>&1 && pnpm install --silent && pnpm exec drizzle-kit push --force"
  echo ">> Schema OK"
}

case $COMPONENT in
  api)
    push_schema
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
    push_schema
    echo ">> Build all..."
    docker compose -f docker-compose.prod.yml build
    echo ">> Start all..."
    docker compose -f docker-compose.prod.yml up -d
    ;;
  db)
    push_schema
    ;;
  nginx)
    echo ">> Installation des configs Nginx..."
    sudo cp infra/nginx/libitex-api.lunion-lab.com /etc/nginx/sites-available/
    sudo cp infra/nginx/libitex-pro.lunion-lab.com /etc/nginx/sites-available/
    sudo cp infra/nginx/libitex-storage.lunion-lab.com /etc/nginx/sites-available/
    sudo ln -sf /etc/nginx/sites-available/libitex-api.lunion-lab.com /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/libitex-pro.lunion-lab.com /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/libitex-storage.lunion-lab.com /etc/nginx/sites-enabled/
    echo ">> Test config Nginx..."
    sudo nginx -t
    echo ">> Reload Nginx..."
    sudo systemctl reload nginx
    echo ">> Generation SSL avec Certbot..."
    # On enchaine les domaines : si le DNS d'un domaine n'est pas pret, certbot
    # echoue mais les autres sont quand meme certifies (--non-interactive).
    # --expand permet d'ajouter de nouveaux domaines a un cert existant sans erreur.
    sudo certbot --nginx \
      -d libitex-api.lunion-lab.com \
      -d libitex-pro.lunion-lab.com \
      -d libitex-storage.lunion-lab.com \
      --expand --non-interactive --agree-tos -m andersonkouadio0118@gmail.com
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
    echo "Usage: ./deploy.sh [api|web|all|nginx|db|down|logs|status]"
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
