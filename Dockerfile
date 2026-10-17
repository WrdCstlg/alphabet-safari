# Alphabet Safari - Lightweight Nginx Web Container
# Pinned (stable branch + digest) so the image can't change underneath a green CI.
FROM nginx:1.30.6-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5

# Copy web assets to default nginx public html directory
COPY . /usr/share/nginx/html

# Custom nginx configuration for PWA & SPA routing and caching
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2|mp3)$ {\n\
        expires 7d;\n\
        add_header Cache-Control "public, no-transform";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
