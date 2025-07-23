// MedasDigital WebClient Express Server with CORS Proxy
// Solves CORS issues with blockchain APIs

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS Configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: false
}));

// Request Logging
app.use((req, res, next) => {
    if (!req.url.includes('.css') && !req.url.includes('.js') && !req.url.includes('.png')) {
        console.log(`${req.method} ${req.url}`);
    }
    next();
});

// JSON Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// PROXY for MedasDigital LCD API (SOLVES CORS)
app.use('/api/lcd', createProxyMiddleware({
    target: 'https://lcd.medas-digital.io:1317',
    changeOrigin: true,
    secure: true,
    pathRewrite: {
        '^/api/lcd': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log('LCD API Proxy:', req.method, req.path);
        proxyReq.setHeader('Accept', 'application/json');
        proxyReq.setHeader('User-Agent', 'MedasDigital-WebClient-Proxy/1.0');
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, Accept';
        console.log(`LCD API Response: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('LCD API Proxy error:', err.message);
        res.status(502).json({ 
            error: 'LCD API unavailable',
            message: 'Cannot connect to blockchain LCD endpoint',
            endpoint: 'https://lcd.medas-digital.io:1317',
            timestamp: new Date().toISOString()
        });
    }
}));

// PROXY for MedasDigital RPC API
app.use('/api/rpc', createProxyMiddleware({
    target: 'https://rpc.medas-digital.io:26657',
    changeOrigin: true,
    secure: true,
    pathRewrite: {
        '^/api/rpc': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log('RPC API Proxy:', req.method, req.path);
        proxyReq.setHeader('Accept', 'application/json');
        proxyReq.setHeader('User-Agent', 'MedasDigital-WebClient-Proxy/1.0');
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, Accept';
        console.log(`RPC API Response: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('RPC API Proxy error:', err.message);
        res.status(502).json({ 
            error: 'RPC API unavailable',
            message: 'Cannot connect to blockchain RPC endpoint',
            endpoint: 'https://rpc.medas-digital.io:26657',
            timestamp: new Date().toISOString()
        });
    }
}));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MedasDigital WebClient Proxy Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        proxies: {
            lcd: {
                target: 'https://lcd.medas-digital.io:1317',
                endpoint: '/api/lcd'
            },
            rpc: {
                target: 'https://rpc.medas-digital.io:26657', 
                endpoint: '/api/rpc'
            }
        },
        cors: {
            enabled: true,
            origins: ['*']
        }
    });
});

// Proxy Status Endpoint
app.get('/api/proxy-status', async (req, res) => {
    const checkEndpoint = async (url, name) => {
        try {
            const startTime = Date.now();
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });
            const endTime = Date.now();
            
            return {
                name,
                url,
                status: response.ok ? 'healthy' : 'error',
                statusCode: response.status,
                responseTime: `${endTime - startTime}ms`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                name,
                url,
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    };
    
    const results = await Promise.all([
        checkEndpoint('https://lcd.medas-digital.io:1317/cosmos/base/tendermint/v1beta1/node_info', 'LCD API'),
        checkEndpoint('https://rpc.medas-digital.io:26657/status', 'RPC API')
    ]);
    
    res.json({
        proxy: 'MedasDigital WebClient Proxy',
        timestamp: new Date().toISOString(),
        endpoints: results
    });
});

// Static Files with Cache Control
const setCustomCacheControl = (res, path) => {
    if (path.includes('.js') || path.includes('.css')) {
        // ✅ KEIN CACHE für JS/CSS während Development!
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (path.includes('.png') || path.includes('.jpg') || path.includes('.svg')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (path.includes('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Served-By', 'MedasDigital-Proxy');
};

// Serve Static Files (your WebClient files)
app.use(express.static('./', { 
    index: 'index.html',
    setHeaders: setCustomCacheControl,
    maxAge: 0
}));

// SPA Routing (for client-side routing)
app.get('*', (req, res) => {
    if (req.url.startsWith('/api/') || 
        req.url.includes('.js') || 
        req.url.includes('.css') || 
        req.url.includes('.png') ||
        req.url.includes('.jpg') ||
        req.url.includes('.svg') ||
        req.url.includes('.ico')) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);
    
    res.status(error.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        path: req.url
    });
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.url,
        availableEndpoints: [
            '/api/health',
            '/api/proxy-status', 
            '/api/lcd/*',
            '/api/rpc/*'
        ],
        timestamp: new Date().toISOString()
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('======================================');
    console.log('MedasDigital WebClient Proxy Server');
    console.log('======================================');
    console.log('');
    console.log(`Server running at:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://app.medas-digital.io:${PORT}`);
    console.log('');
    console.log('CORS Proxy Endpoints:');
    console.log(`   LCD API:  http://localhost:${PORT}/api/lcd`);
    console.log(`   RPC API:  http://localhost:${PORT}/api/rpc`);
    console.log('');
    console.log('Management Endpoints:');
    console.log(`   Health:   http://localhost:${PORT}/api/health`);
    console.log(`   Status:   http://localhost:${PORT}/api/proxy-status`);
    console.log('');
    console.log('CORS issues should be completely resolved!');
    console.log('Your WebClient can now access blockchain APIs without CORS blocks');
    console.log('');
    
    // Test proxy connections on startup
    setTimeout(async () => {
        try {
            const response = await fetch(`http://localhost:${PORT}/api/proxy-status`);
            const status = await response.json();
            console.log('Proxy Status Check:', status.endpoints.map(e => `${e.name}: ${e.status}`).join(', '));
        } catch (error) {
            console.log('Could not verify proxy status:', error.message);
        }
    }, 2000);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down MedasDigital WebClient Proxy Server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nShutting down MedasDigital WebClient Proxy Server');
    process.exit(0);
});
