# BiPOS-Coin Client

Quasar (Vue 3) админ панел. API заявките са към **`/api/`** (same-origin), както при другите BiPOS системи зад nginx.

## Локално

```bash
npm install
npm run dev
```

UI: `http://localhost:9000`  
Dev proxy: `/api` → `http://127.0.0.1:3080` (сървърът трябва да работи)

## Production build

```bash
npm install
npm run build
```

Статичните файлове са в `dist/spa/`. Nginx сервира UI + проксира `/api/` към Node.

### Nginx пример

```nginx
# UI (Quasar dist/spa)
location / {
    root /var/www/bipos-coin;
    try_files $uri $uri/ /index.html;
}

# API — същият модел като другите системи
location /api/ {
    proxy_pass http://127.0.0.1:3080/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;

    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization, X-Requested-With, X-Admin-User, X-Admin-Pass, Cache-Control, cache-control' always;
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type 'text/plain charset=UTF-8';
        add_header Content-Length 0;
        return 204;
    }
}
```

Важно в CORS headers: **`X-Admin-User`** и **`X-Admin-Pass`** (auth на панела).

ESP модулите сочат към публичния URL, напр. `https://your-domain/api` **не** — при тях е пълен base URL на сървъра без path rewrite; те викат `/api/devices/...`. Ако nginx слуша на 443 и проксира `/api/` → `3080`, на модула сложи:

`https://your-domain`  
(кодът добавя `/api/devices/...`)

Или ако ползваш само API host: `https://api.your-domain` с root = Node.

## Модули

| Репо | Роля |
|------|------|
| [BiPOS-Coin-server](https://github.com/TaHuC/BiPOS-Coin-server) | Express API |
| [BiPOS-Coin-client](https://github.com/TaHuC/BiPOS-Coin-client) | този клиент |
| [BiPOS-Coin-frimware](https://github.com/TaHuC/BiPOS-Coin-frimware) | ESP32 firmware |
