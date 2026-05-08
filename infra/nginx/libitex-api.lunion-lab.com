server {
    listen 80;
    server_name libitex-api.lunion-lab.com;

    # Upload d'images : 5 Mo cote applicatif, on prevoit 10 Mo pour les headers
    # multipart et la marge. Sinon nginx rejette avec 413 avant d'atteindre l'API.
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3010;
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
