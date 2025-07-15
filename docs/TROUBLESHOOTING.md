# Troubleshooting Guide - MedasDigital WebClient

## 🚨 Common Issues & Solutions

### WebClient Won't Load

#### Symptoms
- Blank page or loading forever
- JavaScript errors in browser console
- CSS not loading properly

#### Solutions
```bash
# Check browser console (F12)
1. Press F12 to open developer tools
2. Check Console tab for error messages
3. Look for failed network requests in Network tab

# Try different browser
- Test in Chrome, Firefox, Safari
- Try incognito/private mode
- Disable other extensions temporarily

# Clear browser cache
- Ctrl+Shift+Delete (Windows/Linux)
- Cmd+Shift+Delete (macOS)
- Clear all cached data

# Verify files
- Check index.html exists and is readable
- Verify file permissions (644 for files, 755 for directories)
- Ensure web server is running and accessible
```

### Keplr Wallet Issues

#### Keplr Not Detected
```javascript
// Check extension installation
1. Visit chrome://extensions/ or about:addons
2. Verify Keplr is installed and enabled
3. Try refreshing the page
4. Restart browser if needed

// Browser compatibility
- Chrome 90+ ✅
- Firefox 88+ ✅  
- Safari 14+ ✅
- Edge 90+ ✅
- Internet Explorer ❌
```

#### Chain Not Added Automatically
```javascript
// Manual chain addition
1. Open Keplr extension
2. Settings → Manage Chain Visibility
3. Add Chain button
4. Use these settings:

Chain ID: medasdigital-2
Chain Name: MedasDigital
RPC: https://rpc.medas-digital.io:26657
REST: https://api.medas-digital.io:1317
```

#### Connection Refused
```javascript
// Reset connection
1. Click wallet address in WebClient
2. Select "Disconnect"
3. Click "Connect Wallet" again
4. Approve in Keplr popup

// Clear site permissions
1. Keplr Settings → Connected Sites
2. Remove MedasDigital WebClient
3. Reconnect from WebClient
```

### Blockchain Connection Issues

#### RPC Endpoint Unreachable
```bash
# Test RPC connectivity
curl https://rpc.medas-digital.io:26657/status

# Expected response: JSON with node info
# If fails: Check internet connection or try different endpoint
```

#### Network Status Shows Offline
```javascript
// Check network connectivity
1. Verify internet connection
2. Test RPC endpoint manually
3. Check if blockchain network is operational
4. Try refreshing page

// Alternative endpoints
- Primary: https://rpc.medas-digital.io:26657
- Check official docs for backup endpoints
```

#### Balance Not Updating
```javascript
// Force refresh
1. Wait 30 seconds (auto-refresh interval)
2. Refresh browser page manually
3. Disconnect and reconnect wallet
4. Check transaction on block explorer

// Verify correct network
1. Ensure Keplr shows "MedasDigital" network
2. Check chain ID is "medasdigital-2"
3. Verify wallet address format (starts with "medas1...")
```

### Transaction Problems

#### Transaction Fails
```javascript
// Common causes and solutions
1. Insufficient balance
   - Check available balance vs. transaction amount + fees
   - Ensure enough MEDAS for gas fees

2. Invalid address format
   - Verify recipient address starts with "medas1..."
   - Check address length (typically 39-45 characters)

3. Network congestion
   - Try increasing gas limit
   - Wait and retry later

4. RPC connection issues
   - Check network status in WebClient
   - Try refreshing page
```

#### Gas Estimation Failed
```javascript
// Manual gas settings
1. In Keplr transaction popup
2. Click "Advanced" or "Set Gas"
3. Try these values:
   - Gas: 200000
   - Fee: 5000 umedas
4. Confirm transaction
```

#### Transaction Stuck
```javascript
// Check transaction status
1. Copy transaction hash from Keplr
2. Search on block explorer
3. Verify transaction was broadcast

// If stuck:
- Wait for network confirmation (up to 10 minutes)
- Check if sufficient gas was provided
- Contact support with transaction hash if persistent
```

### Performance Issues

#### Slow Loading
```javascript
// Optimization steps
1. Close unnecessary browser tabs
2. Disable other extensions temporarily
3. Clear browser cache and cookies
4. Check system resources (RAM, CPU)

// Network optimization
- Use wired internet connection if possible
- Close bandwidth-heavy applications
- Try during off-peak hours
```

#### Animation Lag
```javascript
// Performance settings
1. Close other applications
2. Use Chrome for best performance
3. Enable hardware acceleration in browser
4. Reduce browser zoom level to 100%

// System requirements
- Minimum: 4GB RAM, modern browser
- Recommended: 8GB RAM, dedicated graphics
```

#### Memory Usage High
```javascript
// Memory optimization
1. Refresh page periodically
2. Close unused tabs
3. Restart browser every few hours
4. Check for browser memory leaks in Task Manager
```

### Docker Deployment Issues

#### Container Won't Start
```bash
# Check Docker status
docker --version
systemctl status docker  # Linux
Docker Desktop status    # Windows/macOS

# View container logs
docker logs medasdigital-webclient

# Common fixes
docker system prune  # Clean up unused resources
docker-compose down && docker-compose up -d
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :80          # Linux/macOS
netstat -ano | find "80"  # Windows

# Use different port
docker run -p 8080:80 medasdigital-webclient

# Or modify docker-compose.yml ports section
```

#### File Permission Errors
```bash
# Fix file permissions
chmod 644 index.html
chmod -R 644 assets/
chmod 755 scripts/

# For Docker on Linux
sudo chown -R $USER:$USER .
```

### Browser-Specific Issues

#### Chrome Issues
```javascript
// Common Chrome fixes
1. Disable extensions one by one
2. Try Chrome Incognito mode
3. Reset Chrome settings
4. Update to latest Chrome version

// Clear Chrome data specifically
chrome://settings/clearBrowserData
```

#### Firefox Issues
```javascript
// Firefox-specific fixes
1. Disable tracking protection temporarily
2. Check about:config for strict settings
3. Try Firefox Private mode
4. Refresh Firefox profile if needed
```

#### Safari Issues
```javascript
// Safari fixes
1. Enable "Develop" menu
2. Disable "Prevent cross-site tracking"
3. Clear Safari cache completely
4. Check Safari version compatibility
```

### Mobile Browser Issues

#### Touch Interface Problems
```javascript
// Mobile optimization
1. Use latest mobile browser
2. Enable "Desktop site" if needed
3. Rotate device for better layout
4. Use zoom controls carefully

// Recommended mobile browsers
- Chrome Mobile ✅
- Firefox Mobile ✅
- Safari iOS ✅
- Samsung Internet ✅
```

#### Keplr Mobile Integration
```javascript
// Mobile wallet setup
1. Install Keplr mobile app
2. Use Keplr built-in browser
3. Or copy addresses manually between apps
4. Limited functionality compared to desktop
```

## 🔧 Advanced Troubleshooting

### Developer Tools Debugging

#### Console Errors
```javascript
// Check for specific errors
1. Press F12 → Console tab
2. Look for red error messages
3. Common patterns:

CORS errors: Check server configuration
404 errors: Missing files or wrong paths
WebSocket errors: Daemon connection issues
Keplr errors: Extension problems
```

#### Network Monitoring
```javascript
// Monitor API calls
1. F12 → Network tab
2. Reload page
3. Check for failed requests (red status)
4. Verify API endpoints are responding

// Common API endpoints to check
- https://rpc.medas-digital.io:26657/status
- https://api.medas-digital.io:1317/cosmos/base/tendermint/v1beta1/node_info
```

### Configuration Issues

#### Custom RPC Endpoints
```javascript
// Modify in index.html if needed
const MEDAS_CHAIN_CONFIG = {
    chainId: "medasdigital-2",
    rpc: "YOUR_CUSTOM_RPC_URL",
    rest: "YOUR_CUSTOM_REST_URL"
};
```

#### Daemon Configuration
```javascript
// Update daemon URLs if using custom setup
const DAEMON_CONFIG = {
    urls: [
        'http://your-daemon-server:8080',
        'http://localhost:8080'
    ]
};
```

## 📞 Getting Help

### Self-Diagnosis Checklist
- [ ] Browser is modern and supported
- [ ] Keplr extension installed and enabled
- [ ] Internet connection stable
- [ ] Browser cache cleared
- [ ] JavaScript enabled
- [ ] Pop-ups allowed for Keplr
- [ ] HTTPS connection (if on custom domain)

### Information to Provide When Seeking Help
1. **Browser**: Name and version
2. **Operating System**: Windows/macOS/Linux version
3. **Error Messages**: Exact text from console
4. **Steps to Reproduce**: What you were doing when error occurred
5. **Screenshots**: If visual issues
6. **Console Logs**: Copy error messages from F12 console

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Check this troubleshooting guide first
- **Community**: MedasDigital community channels

### Emergency Troubleshooting
If WebClient is completely broken:
1. Try direct file access: `file:///path/to/index.html`
2. Test with simple HTTP server: `python -m http.server`
3. Use minimal browser profile with no extensions
4. Test on different device/network to isolate issue

**Remember: Most issues are browser or network related. Start with the basics! 🔧**
