// ===================================
// MedasDigital WebClient Hybrid Server  
// Express Server + Vite Middleware + CosmJS Support
// ES MODULES VERSION (import statt require)
// Port 8080 - Alles in einem!
// ===================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules: __dirname alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
    if (!req.url.includes('.css') && !req.url.includes('.js') && !req.url.includes('.png') && !req.url.includes('/@vite/')) {
        console.log(`${req.method} ${req.url}`);
    }
    next();
});

// ===================================
// JSON PARSING
// ===================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ===================================
// 🚀 VITE MIDDLEWARE (Development Mode)
// ===================================
if (NODE_ENV === 'development') {
    const setupViteMiddleware = async () => {
        try {
            // Dynamic import für Vite (ES modules)
            const { createServer } = await import('vite');
            
            console.log('🚀 Setting up Vite middleware...');
            
            // Create Vite server in middleware mode
            const vite = await createServer({
                server: { middlewareMode: true },
                appType: 'spa',
                configFile: './vite.config.js',
                root: process.cwd()
            });
            
            // Use Vite's connect instance as middleware
            app.use(vite.ssrFixStacktrace);
            app.use(vite.middlewares);
            
            console.log('✅ Vite middleware integrated into Express');
            console.log('🎯 CosmJS ES modules will be bundled automatically');
            
        } catch (error) {
            console.error('❌ Failed to setup Vite middleware:', error.message);
            console.log('🔄 Falling back to static file serving...');
            
            // Fallback: Serve static files normally
            app.use(express.static('./', { 
                index: 'index.html',
                setHeaders: setCustomCacheControl,
                maxAge: 0
            }));
        }
    };
    
    // Setup Vite middleware async
    setupViteMiddleware();
    
} else {
    // ===================================
    // PRODUCTION MODE (Serve built files)
    // ===================================
    console.log('📦 Production mode - serving built files');
    
    app.use(express.static('./dist', { 
        index: 'index.html',
        setHeaders: setCustomCacheControl,
        maxAge: '1d' // 1 day cache for production
    }));
}

// ===================================
// ✅ MANAGEMENT ENDPOINTS (Deine APIs bleiben!)
// ===================================

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MedasDigital WebClient Hybrid Server (Express + Vite)',
        version: '1.2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: NODE_ENV,
        moduleSystem: 'ES Modules',
        features: {
            expressServer: true,
            viteMiddleware: NODE_ENV === 'development',
            cosmjsSupport: true,
            staticFiles: true,
            blockchainProxy: false,
            directBlockchainAccess: true,
            managementAPIs: true,
            esModules: true
        },
        endpoints: {
            health: '/api/health',
            blockchainStatus: '/api/blockchain-status',
            static: '/',
            vite: NODE_ENV === 'development' ? '/@vite/' : null
        }
    });
});

// Blockchain Connectivity Test
app.get('/api/blockchain-status', async (req, res) => {
    const checkEndpoint = async (url, name) => {
        try {
            const startTime = Date.now();
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'MedasDigital-Hybrid-Server/1.2.0'
                },
                signal: AbortSignal.timeout(10000)
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
        mode: 'express-vite-cosmjs-esmodules',
        timestamp: new Date().toISOString(),
        summary: {
            healthy: healthyCount,
            total: totalCount,
            percentage: Math.round((healthyCount / totalCount) * 100)
        },
        endpoints: results,
        recommendation: healthyCount === totalCount ? 
            '🎉 All blockchain endpoints healthy - CosmJS ready!' : 
            `⚠️ ${totalCount - healthyCount}/${totalCount} endpoints having issues - may affect CosmJS functionality`,
        note: 'Blockchain APIs are accessed directly from browser with CosmJS (ES Modules)'
    });
});

// Server Info Endpoint
app.get('/api/info', (req, res) => {
    res.json({
        server: 'MedasDigital WebClient Hybrid Server',
        version: '1.2.0',
        mode: 'express-vite-cosmjs-esmodules',
        description: 'Express server with Vite middleware for CosmJS support (ES Modules)',
        architecture: {
            baseServer: 'Express.js (ES Modules)',
            frontendBundler: NODE_ENV === 'development' ? 'Vite (middleware)' : 'Vite (built)',
            blockchainLibrary: 'CosmJS',
            walletIntegration: 'Keplr',
            moduleSystem: 'ES Modules (import/export)',
            benefits: [
                'Single port 8080 for everything',
                'Hot module replacement in development',
                'CosmJS ES modules support',
                'No CORS issues',
                'Production-ready builds',
                'Modern ES modules throughout'
            ]
        },
        traffic: {
            staticFiles: '40-60% (served by Express/Vite)',
            viteHMR: NODE_ENV === 'development' ? '10-20% (Vite websockets)' : '0%',
            managementAPIs: '1-5% (handled by Express)',
            blockchainAPIs: '20-40% (direct from browser via CosmJS)'
        }
    });
});

// ===================================
// CACHE CONTROL HELPER
// ===================================
const setCustomCacheControl = (res, filePath) => {
    if (filePath.includes('.js') || filePath.includes('.css')) {
        // KEIN CACHE für JS/CSS während Development
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (filePath.includes('.png') || filePath.includes('.jpg') || filePath.includes('.svg') || filePath.includes('.ico')) {
        // CACHE für Bilder (24 Stunden)
        res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (filePath.includes('.html')) {
        // KEIN CACHE für HTML
        res.setHeader('Cache-Control', 'no-cache');
    } else {
        // DEFAULT für andere Dateien
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    // CORS und Server-Identifier
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Served-By', 'MedasDigital-Hybrid-Server');
    res.setHeader('X-Server-Mode', 'express-vite-cosmjs-esmodules');
};

// ===================================
// ERROR HANDLING
// ===================================

// 404 Handler für API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.url,
        availableEndpoints: [
            '/api/health - Server health check',
            '/api/blockchain-status - Test blockchain connectivity', 
            '/api/info - Server information'
        ],
        note: 'Blockchain APIs are now handled by CosmJS directly in browser',
        cosmjsSupport: true,
        moduleSystem: 'ES Modules',
        timestamp: new Date().toISOString()
    });
});

// SPA ROUTING für Production (Development wird von Vite gehandelt)
if (NODE_ENV !== 'development') {
    app.get('*', (req, res) => {
        // Für Dateien mit Extensions, 404 zurückgeben
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
                note: 'Check if the file exists in the dist directory'
            });
            return;
        }
        
        // Für alle anderen Routen, serve index.html (SPA)
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);
    
    res.status(error.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        path: req.url,
        server: 'MedasDigital Hybrid Server (Express + Vite + ES Modules)'
    });
});

// ===================================
// 🚀 START SERVER
// ===================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==========================================');
    console.log('🚀 MedasDigital WebClient Hybrid Server');
    console.log('   Express + Vite + CosmJS + ES Modules');
    console.log('==========================================');
    console.log('');
    console.log(`Server running at:`);
    console.log(`   📍 Local:    http://localhost:${PORT}`);
    console.log(`   🌐 Network:  http://app.medas-digital.io:${PORT}`);
    console.log('');
    console.log('🎯 HYBRID MODE ACTIVE:');
    console.log(`   ✅ Express Server:   http://localhost:${PORT}/`);
    console.log(`   ✅ Health Check:     http://localhost:${PORT}/api/health`);
    console.log(`   ✅ Blockchain Test:  http://localhost:${PORT}/api/blockchain-status`);
    console.log(`   ✅ Server Info:      http://localhost:${PORT}/api/info`);
    
    if (NODE_ENV === 'development') {
        console.log(`   🔥 Vite HMR:         http://localhost:${PORT}/ (with hot reload)`);
        console.log(`   📦 CosmJS Bundling:  Automatic via Vite middleware`);
    } else {
        console.log(`   📦 Static Files:     http://localhost:${PORT}/ (from dist/)`);
        console.log(`   📦 CosmJS Built:     Pre-bundled for production`);
    }
    
    console.log('');
    console.log('🚀 MODULE SYSTEM:');
    console.log('   📡 ES Modules:       import/export (not require)');
    console.log('   📡 CosmJS Library:   Direct browser access with ES modules');
    console.log('   📡 LCD API:          https://lcd.medas-digital.io:1317 (via CosmJS)');
    console.log('   📡 RPC API:          https://rpc.medas-digital.io:26657 (via CosmJS)');
    console.log('');
    console.log('✅ BENEFITS:');
    console.log('   🎯 Single Port 8080 für alles');
    console.log('   ⚡ Vite Hot Module Replacement');  
    console.log('   🛠️ Osmosis-style CosmJS Integration');
    console.log('   🔥 ES Modules + Browser Polyfills');
    console.log('   📊 Express APIs + Vite Frontend');
    console.log('   🚫 Keine require() Errors mehr');
    console.log('');
    console.log('🎉 Ready for CosmJS staking! Test with your Keplr wallet.');
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

setTimeout(async () => {
    try {
        console.log('🔍 Testing server health on startup...');
        const response = await fetch(`http://localhost:${PORT}/api/health`);
        const health = await response.json();
        
        console.log(`📊 Server Mode: ${health.mode}`);
        console.log(`📊 Module System: ${health.moduleSystem}`);
        console.log(`📊 Vite Middleware: ${health.features.viteMiddleware ? 'Active' : 'Disabled'}`);
        console.log(`📊 CosmJS Support: ${health.features.cosmjsSupport ? 'Enabled' : 'Disabled'}`);
        console.log(`📊 ES Modules: ${health.features.esModules ? 'Enabled' : 'Disabled'}`);
        
        if (health.status === 'healthy') {
            console.log('🎉 Hybrid server healthy - Express + Vite + CosmJS + ES Modules ready!');
        }
    } catch (error) {
        console.log('⚠️ Could not verify server health on startup:', error.message);
    }
}, 2000);
