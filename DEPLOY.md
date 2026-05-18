# HBPL — OCI Server Deployment Guide

Server: `ubuntu@80.225.229.50`  
Stack: Nginx → Next.js (PM2 :3000) + Django/Gunicorn (:8000) + PostgreSQL

---

## 1. Connect to server

```bash
ssh -i "C:\Users\keys\ssh-key-2026-03-15.key" ubuntu@80.225.229.50
```

---

## 2. System packages

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y \
  python3 python3-pip python3-venv \
  nodejs npm \
  postgresql postgresql-contrib \
  nginx \
  git \
  certbot python3-certbot-nginx \
  curl

sudo npm install -g pm2
```

---

## 3. PostgreSQL — create database and user

```bash
sudo -u postgres psql
```

Inside the psql shell:

```sql
CREATE DATABASE hbpl_db;
CREATE USER hbpl_user WITH PASSWORD 'hbpl@123';
ALTER ROLE hbpl_user SET client_encoding TO 'utf8';
ALTER ROLE hbpl_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE hbpl_user SET timezone TO 'Asia/Kolkata';
GRANT ALL PRIVILEGES ON DATABASE hbpl_db TO hbpl_user;
\q
```

---

## 4. Create app directory and set permissions

```bash
sudo mkdir -p /var/www/hbpl
sudo chown ubuntu:ubuntu /var/www/hbpl
chmod 755 /var/www/hbpl
```

---

## 5. Clone the repository

```bash
cd /var/www/hbpl
git clone https://github.com/shubhamchauhan8881/hbpl-monorepo.git .
```

---

## 6. Backend — Python environment

```bash
cd /var/www/hbpl/backend

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

---

## 7. Backend — environment file

```bash
nano /var/www/hbpl/backend/.env
```

Paste the following (fill in your real values):

```env
DEBUG=False
DJANGO_SECRET_KEY=replace-with-50-random-chars
ALLOWED_HOSTS=80.225.229.50,yourdomain.com,www.yourdomain.com

DATABASE_URL=postgres://hbpl_user:CHANGE_THIS_PASSWORD@127.0.0.1:5432/hbpl_db
DB_SSL=False
DB_CONN_MAX_AGE=0

HTTPS_ENABLED=False
HSTS_SECONDS=0
HSTS_INCLUDE_SUBDOMAINS=False
HSTS_PRELOAD=False
SECURE_REFERRER_POLICY=same-origin
X_FRAME_OPTIONS=DENY

CSRF_TRUSTED_ORIGINS=http://80.225.229.50
CORS_ALLOWED_ORIGINS=http://80.225.229.50

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=yourname@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=HBPL <yourname@gmail.com>
```

Save and exit: `Ctrl+O` → `Enter` → `Ctrl+X`

Lock down the env file so only the owner can read it:

```bash
chmod 600 /var/www/hbpl/backend/.env
```

---

## 8. Backend — migrate, collectstatic, superuser

```bash
cd /var/www/hbpl/backend
source .venv/bin/activate

python manage.py migrate
python manage.py collectstatic --no-input
python manage.py createsuperuser
```

---

## 9. Backend — media and static folder permissions

```bash
sudo mkdir -p /var/www/hbpl/backend/media
sudo mkdir -p /var/www/hbpl/backend/staticfiles

sudo chown -R ubuntu:www-data /var/www/hbpl/backend/media
sudo chown -R ubuntu:www-data /var/www/hbpl/backend/staticfiles

sudo chmod -R 775 /var/www/hbpl/backend/media
sudo chmod -R 755 /var/www/hbpl/backend/staticfiles
```

---

## 10. Backend — systemd service (Gunicorn)

```bash
sudo nano /etc/systemd/system/hbpl-backend.service
```

Paste:

```ini
[Unit]
Description=HBPL Django Backend (Gunicorn)
After=network.target postgresql.service

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/hbpl/backend
EnvironmentFile=/var/www/hbpl/backend/.env
ExecStart=/var/www/hbpl/backend/.venv/bin/gunicorn \
    hbpl_project.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile /var/log/hbpl-backend-access.log \
    --error-logfile /var/log/hbpl-backend-error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hbpl-backend
sudo systemctl start hbpl-backend

# Verify it's running
sudo systemctl status hbpl-backend
```

---

## 11. Frontend — build

```bash
cd /var/www/hbpl/frontend/hbpl

nano .env.local
```

Paste:

```env
NEXT_PUBLIC_API_URL=http://80.225.229.50/api
```

Save and exit, then:

```bash
npm install
npm run build
```

---

## 12. Frontend — run with PM2

```bash
cd /var/www/hbpl/frontend/hbpl

pm2 start npm --name "hbpl-frontend" -- start
pm2 save

# Make PM2 auto-start on reboot (run the command it prints)
pm2 startup
```

Verify:

```bash
pm2 status
pm2 logs hbpl-frontend --lines 20
```

---

## 13. Nginx — configuration

Remove the default site and create the HBPL config:

```bash
sudo rm -f /etc/nginx/sites-enabled/default

sudo nano /etc/nginx/sites-available/hbpl
```

Paste:

```nginx
upstream django_app {
    server 127.0.0.1:8000;
}

upstream nextjs_app {
    server 127.0.0.1:3000;
}

server {
    listen 80 default_server;
    server_name 80.225.229.50 yourdomain.com www.yourdomain.com;

    client_max_body_size 25M;

    # Django static files
    location /static/ {
        alias /var/www/hbpl/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Django media files (uploaded images, PDFs)
    location /media/ {
        alias /var/www/hbpl/backend/media/;
        expires 7d;
    }

    # Django REST API
    location /api/ {
        proxy_pass http://django_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django admin panel
    location /django-admin/ {
        proxy_pass http://django_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js frontend (everything else)
    location / {
        proxy_pass http://nextjs_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/hbpl /etc/nginx/sites-enabled/hbpl
sudo nginx -t
sudo systemctl reload nginx
```

At this point your app is live at `http://80.225.229.50`.

---

## 14. SSL with Certbot (after pointing your domain)

> Only run this after your domain DNS is pointing to `80.225.229.50`.

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will auto-edit the Nginx config to add HTTPS. Then update your `.env`:

```bash
nano /var/www/hbpl/backend/.env
```

Change:

```env
HTTPS_ENABLED=True
HSTS_SECONDS=3600
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Also update the frontend:

```bash
nano /var/www/hbpl/frontend/hbpl/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

Rebuild frontend and restart backend:

```bash
cd /var/www/hbpl/frontend/hbpl
npm run build
pm2 restart hbpl-frontend

sudo systemctl restart hbpl-backend
```

---

## 15. OCI firewall — open ports

In your OCI console → Networking → VCN → Security List, add **Ingress Rules**:

| Port | Protocol | Source    | Purpose     |
|------|----------|-----------|-------------|
| 80   | TCP      | 0.0.0.0/0 | HTTP        |
| 443  | TCP      | 0.0.0.0/0 | HTTPS       |
| 22   | TCP      | your IP   | SSH (already open) |

Also run on the server itself (Ubuntu's firewall):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 16. Useful management commands

```bash
# View backend logs
sudo journalctl -u hbpl-backend -f

# Restart backend after code changes
sudo systemctl restart hbpl-backend

# Pull latest code and redeploy
cd /var/www/hbpl
git pull

# Backend update
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --no-input
sudo systemctl restart hbpl-backend

# Frontend update
cd /var/www/hbpl/frontend/hbpl
npm install
npm run build
pm2 restart hbpl-frontend

# Check all services
sudo systemctl status hbpl-backend
sudo systemctl status nginx
pm2 status
sudo systemctl status postgresql
```

---

## Services summary

| Service       | Port          | Managed by |
|---------------|---------------|------------|
| Nginx         | 80 / 443      | systemd    |
| Django/Gunicorn | 8000 (internal) | systemd |
| Next.js       | 3000 (internal) | PM2      |
| PostgreSQL    | 5432 (internal) | systemd  |
