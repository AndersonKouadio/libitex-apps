server {
    listen 80;
    server_name libitex-storage.lunion-lab.com;

    # Acces lecture public aux fichiers du bucket libitex-public.
    # MinIO expose son API S3 sur le port 9000 — on autorise uniquement
    # GET/HEAD pour ne pas exposer les operations admin.
    client_max_body_size 10M;

    location / {
        # Limiter aux methodes de lecture
        limit_except GET HEAD OPTIONS {
            deny all;
        }

        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache navigateur des images servies
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name libitex-storage-console.lunion-lab.com;

    # Console d'administration MinIO — protegee par les credentials
    # MINIO_ROOT_USER / MINIO_ROOT_PASSWORD.
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
