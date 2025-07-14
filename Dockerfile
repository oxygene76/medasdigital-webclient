FROM nginx:alpine

# Copy MedasDigital WebClient files

COPY index.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/ 2>/dev/null || true
COPY docs/ /usr/share/nginx/html/docs/ 2>/dev/null || true
COPY README.md /usr/share/nginx/html/ 2>/dev/null || true

# Create nginx configuration for MedasDigital WebClient

RUN echo ‘server {   
listen 80;   
server_name localhost;   
root /usr/share/nginx/html;   
index index.html;   
  
# Serve MedasDigital WebClient   
location / {   
try_files $uri $uri/ /index.html;   
}   
  
# Proxy API calls to daemon (if running)   
location /api/ {   
proxy_pass http://host.docker.internal:8080/;   
proxy_set_header Host $host;   
proxy_set_header X-Real-IP $remote_addr;   
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;   
proxy_set_header X-Forwarded-Proto $scheme;   
proxy_connect_timeout 5s;   
proxy_send_timeout 5s;   
proxy_read_timeout 5s;   
# Fallback if daemon not available   
error_page 502 503 504 = @fallback;   
}   
  
# WebSocket proxy to daemon   
location /ws/ {   
proxy_pass http://host.docker.internal:8080/;   
proxy_http_version 1.1;   
proxy_set_header Upgrade $http_upgrade;   
proxy_set_header Connection “upgrade”;   
proxy_set_header Host $host;   
proxy_connect_timeout 5s;   
# Fallback if daemon not available   
error_page 502 503 504 = @fallback;   
}   
  
# Fallback for when MedasDigital daemon is not running   
location @fallback {   
return 200 “{\“status\”: \“daemon_offline\”, \“message\”: \“MedasDigital WebClient running without daemon\”}”;   
add_header Content-Type application/json;   
}   
  
# Security headers   
add_header X-Frame-Options “SAMEORIGIN” always;   
add_header X-Content-Type-Options “nosniff” always;   
add_header Referrer-Policy “no-referrer-when-downgrade” always;   
  
# Cache static assets   
location ~* .(js|css|png|jpg|jpeg|gif|ico|svg)$ {   
expires 1y;   
add_header Cache-Control “public, immutable”;   
}   
}’ > /etc/nginx/conf.d/default.conf

# Remove default nginx config

RUN rm /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true

EXPOSE 80

# Health check for MedasDigital WebClient

HEALTHCHECK –interval=30s –timeout=3s –start-period=5s –retries=3   
CMD curl -f http://localhost/ || exit 1

CMD [“nginx”, “-g”, “daemon off;”]
