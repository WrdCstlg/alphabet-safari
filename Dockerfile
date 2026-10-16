# Alphabet Safari - Lightweight Nginx Web Container
FROM nginx:alpine

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
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {\n\
        expires 7d;\n\
        add_header Cache-Control "public, no-transform";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
