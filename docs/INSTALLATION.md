# Installation Guide - MedasDigital WebClient

## 🚀 Quick Start Options

### Option 1: Your Server (Recommended)
Upload files directly to your web server:
```bash
# Upload to your server
scp -r * user@yourserver.com:/var/www/medasdigital-webclient/

# Or use FTP/SFTP to upload all files
```

### Option 2: Local Development
```bash
# Clone repository
git clone https://github.com/yourusername/medasdigital-webclient.git
cd medasdigital-webclient

# Start local server
python -m http.server 8000
# or
npx live-server --port=8000

# Access at http://localhost:8000
```

### Option 3: Docker Deployment
```bash
# Build container
docker build -t medasdigital-webclient .

# Run WebClient only
docker run -p 80:80 medasdigital-webclient

# Or with daemon support
docker-compose up -d
```

## 📋 Requirements

### Minimum Requirements
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Internet connection for blockchain features
- Keplr wallet extension for full functionality

### For Docker Deployment
- Docker 20.0+ 
- 512MB RAM, 100MB storage
- Open port 80 (or custom port)

### For Development
- Node.js 16+ (optional)
- Git
- Text editor

## 🛠️ Setup Steps

### 1. Download/Clone
```bash
# Clone from repository
git clone https://github.com/yourusername/medasdigital-webclient.git
cd medasdigital-webclient

# Or download ZIP and extract
```

### 2. Environment Setup
```bash
# Make scripts executable (Linux/macOS)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Windows
scripts\setup.bat
```

### 3. Start WebClient

#### Simple HTTP Server
```bash
# Python (most systems)
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

#### Docker Container
```bash
# Build and run
docker build -t medasdigital-webclient .
docker run -p 8080:80 medasdigital-webclient
```

#### Web Server (Apache/Nginx)
```bash
# Copy files to web root
cp -r * /var/www/html/medasdigital-webclient/

# Configure virtual host as needed
```

## 🔧 Configuration

### Basic Configuration
The WebClient works out-of-the-box with:
- **Blockchain**: medasdigital-2 chain
- **RPC**: https://rpc.medas-digital.io:26657
- **REST**: https://api.medas-digital.io:1317

### Custom Configuration
Edit the configuration in `index.html`:
```javascript
const MEDAS_CHAIN_CONFIG = {
    chainId: "medasdigital-2",
    rpc: "https://rpc.medas-digital.io:26657",
    rest: "https://api.medas-digital.io:1317"
    // Modify as needed
};
```

### Daemon Integration (Optional)
If you have a MedasDigital daemon running:
```javascript
const DAEMON_CONFIG = {
    urls: [
        'http://localhost:8080',
        'http://your-daemon-server:8080'
    ]
};
```

## 📱 Browser Setup

### Install Keplr Wallet
1. Visit [keplr.app](https://www.keplr.app/)
2. Install browser extension
3. Create or import wallet
4. The WebClient will auto-configure MedasDigital chain

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ Internet Explorer (not supported)

## 🚨 Troubleshooting

### WebClient Won't Load
1. Check browser console for errors
2. Verify HTTP server is running
3. Check file permissions
4. Try different browser

### Keplr Not Detected
1. Install Keplr browser extension
2. Refresh the page
3. Check if extension is enabled
4. Try incognito/private mode

### Blockchain Connection Issues
1. Check internet connection
2. Verify RPC endpoints are accessible:
   ```bash
   curl https://rpc.medas-digital.io:26657/status
   ```
3. Try switching networks in Keplr

### Performance Issues
1. Close unnecessary browser tabs
2. Disable other extensions temporarily
3. Clear browser cache
4. Check system resources

### Docker Issues
```bash
# Check if Docker is running
docker --version

# Check container logs
docker logs medasdigital-webclient

# Restart container
docker restart medasdigital-webclient
```

## 🔒 Security Notes

### For Production Deployment
- Use HTTPS (SSL/TLS certificates)
- Configure proper Content Security Policy
- Keep Keplr wallet updated
- Never share private keys
- Verify daemon authenticity if using external daemon

### File Permissions
```bash
# Secure file permissions
chmod 644 index.html
chmod 644 assets/*
chmod 755 scripts/
```

## 📊 Performance Optimization

### Web Server Configuration
```nginx
# Nginx example
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/medasdigital-webclient;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache Configuration
```apache
# .htaccess example
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
</IfModule>

<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

## 🔄 Updates

### Manual Update
1. Download new version
2. Backup current installation
3. Replace files (keep custom configuration)
4. Clear browser cache

### Docker Update
```bash
# Pull new image
docker pull medasdigital-webclient:latest

# Restart with new version
docker-compose up -d
```

## 📞 Support

### Self-Help
1. Check browser console for errors
2. Review this installation guide
3. Verify all requirements are met

### Community Support
- GitHub Issues for bug reports
- Documentation for common questions

The MedasDigital WebClient is designed to work standalone with minimal setup! 🌟
