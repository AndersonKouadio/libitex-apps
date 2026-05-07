# Nginx — configuration des sous-domaines

Sur le VPS, copier les configs vers `/etc/nginx/sites-available/` puis lier
dans `sites-enabled/`. Renseigner les certificats via `certbot --nginx`.

## Sous-domaines

| Sous-domaine | Cible | Port |
|---|---|---|
| `libitex-pro.lunion-lab.com` | Frontend Next.js | 3011 |
| `libitex-api.lunion-lab.com` | API NestJS | 3010 |
| `libitex-storage.lunion-lab.com` | MinIO API S3 (lecture publique) | 9000 |
| `libitex-storage-console.lunion-lab.com` | MinIO Console admin | 9001 |

## Setup d'un nouveau sous-domaine

```bash
sudo cp infra/nginx/<sous-domaine> /etc/nginx/sites-available/<sous-domaine>
sudo ln -s /etc/nginx/sites-available/<sous-domaine> /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d <sous-domaine>
```

## Ajout de la pile MinIO (premiere fois)

1. Pointer les DNS `libitex-storage` et `libitex-storage-console` vers le VPS.
2. Mettre à jour `.env` avec les variables `STORAGE_*`
   (cf. `.env.production.example`).
3. Copier la config nginx `libitex-storage.lunion-lab.com` puis recharger.
4. `docker compose -f docker-compose.prod.yml up -d minio` — au premier
   demarrage l'API NestJS cree le bucket `libitex-public` avec acces
   public en lecture.
5. Verifier : `curl https://libitex-storage.lunion-lab.com/minio/health/ready`.
