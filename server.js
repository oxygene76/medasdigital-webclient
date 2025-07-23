// ===================================
// MedasDigital WebClient Hybrid Server
// Static Files + Management APIs (OHNE Blockchain Proxy)
// ===================================

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ===================================
// CORS CONFIGURATION
// ===================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: false
}));

// ===================================
// REQUEST LOGGING
// ===================================
app.use((req, res, next) => {
    if (!req.url.includes('.css') && !req.url.includes('.js') && !req.url.includes('.png')) {
        console.log(`${req.method} ${req.url}`);
    }
    next();
});

// ===================================
// JSON PARSING (für Management APIs)
// ===================================
app.use(express.json({ limit: '1mb' })); // Kleineres Limit, da keine Blockchain-Posts mehr
app.use(express.urlencoded({ extended: true }));

// ===================================
// ✅ MANAGEMENT ENDPOINTS
// ===================================

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MedasDigital WebClient Hybrid Server',
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: 'hybrid',
        features: {
            staticFiles: true,
            blockchainProxy: false, // ← Deaktiviert!
            directBlockchainAccess: true,
            managementAPIs: true
        },
        endpoints: {
            health: '/api/health',
            blockchainStatus: '/api/blockchain-status',
            static: '/'
        }
    });
});

// Blockchain Connectivity Test (OHNE Proxy - direkt testen)
app.get('/api/blockchain-status', async (req, res) => {
    const checkEndpoint = async (url, name) => {
        try {
            const startTime = Date.now();
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'MedasDigital-Hybrid-Server/1.1.0'
                },
                signal: AbortSignal.timeout(10000) // 10 Sekunden Timeout
            });
            const endTime = Date.now();
            
            return {
                name,
                url,
                status: response.ok ? 'healthy' : 'error',
                statusCode: response.status,
                responseTime: `${endTime - startTime}ms`,
                corsEnabled: !!response.headers.get('access-control-allow-origin'),
                directAccessible: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                name,
                url,
                status: 'error',
                error: error.message,
                directAccessible: false,
                timestamp: new Date().toISOString()
            };
        }
    };
    
    console.log('🔍 Testing direct blockchain connectivity...');
    
    const results = await Promise.all([
        checkEndpoint('https://lcd.medas-digital.io:1317/cosmos/base/tendermint/v1beta1/node_info', 'LCD API'),
        checkEndpoint('https://rpc.medas-digital.io:26657/status', 'RPC API'),
        checkEndpoint('https://lcd.medas-digital.io:1317/cosmos/staking/v1beta1/pool', 'Staking Pool'),
        checkEndpoint('https://lcd.medas-digital.io:1317/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED', 'Validators')
    ]);
    
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const totalCount = results.length;
    
    res.json({
        server: 'MedasDigital WebClient Hybrid Server',
        mode: 'direct-blockchain-access',
        timestamp: new Date().toISOString(),
        summary: {
            healthy: healthyCount,
            total: totalCount,
            percentage: Math.round((healthyCount / totalCount) * 100)
        },
        endpoints: results,
        recommendation: healthyCount === totalCount ? 
            '🎉 All blockchain endpoints healthy - direct access working perfectly!' : 
            `⚠️ ${totalCount - healthyCount}/${totalCount} endpoints having issues - may affect functionality`,
        note: 'Blockchain APIs are accessed directly from browser (no proxy buffering)'
    });
});

// Server Info Endpoint
app.get('/api/info', (req, res) => {
    res.json({
        server: 'MedasDigital WebClient Hybrid Server',
        version: '1.1.0',
        mode: 'hybrid',
        description: 'Serves static files + management APIs, blockchain access is direct from browser',
        architecture: {
            staticFiles: 'Express Static Middleware',
            managementAPIs: 'Express Route Handlers', 
            blockchainAPIs: 'Direct from Browser (no proxy)',
            benefits: [
                'No proxy timeout issues',
                'Better performance for blockchain calls',
                'Simpler architecture',
                'Easier maintenance'
            ]
        },
        traffic: {
            staticFiles: '60-80% (served by Express)',
            managementAPIs: '1-5% (handled by Express)',
            blockchainAPIs: '15-35% (direct from browser)'
        }
    });
});

// ===================================
// ✅ STATIC FILE SERVING
// ===================================

// Cache Control für verschiedene Dateitypen
const setCustomCacheControl = (res, path) => {
    if (path.includes('.js') || path.includes('.css')) {
        // ✅ KEIN CACHE für JS/CSS während Development
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (path.includes('.png') || path.includes('.jpg') || path.includes('.svg') || path.includes('.ico')) {
        // ✅ CACHE für Bilder (24 Stunden)
        res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (path.includes('.html')) {
        // ✅ KEIN CACHE für HTML
        res.setHeader('Cache-Control', 'no-cache');
    } else {
        // ✅ DEFAULT für andere Dateien
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 Stunde
    }
    
    // ✅ CORS und Server-Identifier
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Served-By', 'MedasDigital-Hybrid-Server');
    res.setHeader('X-Server-Mode', 'hybrid');
};

// ✅ SERVE STATIC FILES (Hauptfunktion)
app.use(express.static('./', { 
    index: 'index.html',
    setHeaders: setCustomCacheControl,
    maxAge: 0 // Cache-Control wird von setCustomCacheControl gesteuert
}));

// ===================================
// ERROR HANDLING
// ===================================

// 404 Handler für API routes (Management APIs)
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.url,
        availableEndpoints: [
            '/api/health - Server health check',
            '/api/blockchain-status - Test blockchain connectivity',
            '/api/info - Server information'
        ],
        note: 'Blockchain APIs (/api/lcd, /api/rpc) are no longer proxied - access directly from browser',
        directEndpoints: {
            lcd: 'https://lcd.medas-digital.io:1317',
            rpc: 'https://rpc.medas-digital.io:26657'
        },
        timestamp: new Date().toISOString()
    });
});

// ✅ SPA ROUTING (für Client-Side Routing)
app.get('*', (req, res) => {
    // Wenn es eine Datei-Extension ist, 404 zurückgeben
    if (req.url.startsWith('/api/') || 
        req.url.includes('.js') || 
        req.url.includes('.css') || 
        req.url.includes('.png') ||
        req.url.includes('.jpg') ||
        req.url.includes('.svg') ||
        req.url.includes('.ico') ||
        req.url.includes('.woff') ||
        req.url.includes('.ttf')) {
        res.status(404).json({ 
            error: 'File not found',
            path: req.url,
            note: 'Check if the file exists in the assets directory'
        });
        return;
    }
    
    // Für alle anderen Routen, serve index.html (SPA)
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);
    
    res.status(error.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        path: req.url,
        server: 'MedasDigital Hybrid Server'
    });
});

// ===================================
// 🚀 START SERVER
// ===================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==========================================');
    console.log('🚀 MedasDigital WebClient Hybrid Server');
    console.log('==========================================');
    console.log('');
    console.log(`Server running at:`);
    console.log(`   📍 Local:    http://localhost:${PORT}`);
    console.log(`   🌐 Network:  http://app.medas-digital.io:${PORT}`);
    console.log('');
    console.log('🎯 HYBRID MODE ACTIVE:');
    console.log(`   ✅ Static Files:     http://localhost:${PORT}/`);
    console.log(`   ✅ Health Check:     http://localhost:${PORT}/api/health`);
    console.log(`   ✅ Blockchain Test:  http://localhost:${PORT}/api/blockchain-status`);
    console.log(`   ✅ Server Info:      http://localhost:${PORT}/api/info`);
    console.log('');
    console.log('🚀 BLOCKCHAIN ACCESS:');
    console.log('   📡 LCD API:  https://lcd.medas-digital.io:1317 (direct from browser)');
    console.log('   📡 RPC API:  https://rpc.medas-digital.io:26657 (direct from browser)');
    console.log('');
    console.log('✅ BENEFITS:');
    console.log('   🚫 No more proxy timeout issues');
    console.log('   ⚡ Better blockchain API performance');  
    console.log('   🛠️ Simpler architecture');
    console.log('   📊 60-80% static files via Express');
    console.log('   📊 15-35% blockchain APIs direct');
    console.log('   📊 1-5% management APIs via Express');
    console.log('');
    console.log('🎉 Ready for action! Test your staking now.');
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down MedasDigital Hybrid Server gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MedasDigital Hybrid Server gracefully...');
    process.exit(0);
});

// ===================================
// STARTUP HEALTH CHECK
// ===================================

// Test blockchain connectivity on startup
setTimeout(async () => {
    try {
        console.log('🔍 Testing blockchain connectivity on startup...');
        const response = await fetch(`http://localhost:${PORT}/api/blockchain-status`);
        const status = await response.json();
        
        console.log(`📊 Blockchain Status: ${status.summary.healthy}/${status.summary.total} endpoints healthy`);
        
        if (status.summary.percentage === 100) {
            console.log('🎉 All blockchain endpoints accessible - ready for direct access!');
        } else {
            console.log(`⚠️ Some blockchain endpoints may be experiencing issues (${status.summary.percentage}% healthy)`);
        }
    } catch (error) {
        console.log('⚠️ Could not verify blockchain connectivity on startup:', error.message);
    }
}, 2000);
