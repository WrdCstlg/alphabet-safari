# Alphabet Safari - Lightweight Nginx Web Container
# Pinned (stable branch + digest) so the image can't change underneath a green CI.
FROM nginx:1.30.6-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5

# Copy web assets to default nginx public html directory
COPY . /usr/share/nginx/html

# Custom nginx configuration for PWA & SPA routing and caching
# - App code (html/js/css/json) is "no-cache": browsers revalidate every load, so a deploy is
#   picked up at once. A 7-day expiry here used to let the service worker precache a stale
#   script.js from the HTTP cache when a new CACHE_NAME installed.
# - Clips, images and fonts are long-lived; they are only replaced together with a new CACHE_NAME.
# - Only extension-less paths fall back to index.html, so a missing .js/.mp3 is a real 404
#   instead of HTML served with the wrong content type.
# - gzip roughly quarters script.js/styles.css on slow mobile links.
RUN printf 'server {\n\
    listen 80;\n\
    listen [::]:80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    gzip on;\n\
    gzip_types text/css application/javascript application/json image/svg+xml;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
        add_header Cache-Control "no-cache";\n\
    }\n\
\n\
    location ~* \\.(html|js|css|json)$ {\n\
        try_files $uri =404;\n\
        add_header Cache-Control "no-cache";\n\
        add_header X-Content-Type-Options "nosniff";\n\
    }\n\
\n\
    location ~* \\.(mp3|woff2|png|jpg|jpeg|gif|ico|svg|webp)$ {\n\
        try_files $uri =404;\n\
        add_header Cache-Control "public, max-age=604800";\n\
        add_header X-Content-Type-Options "nosniff";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
