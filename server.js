// ===================================
// MedasDigital WebClient Hybrid Server  
// Express Server + CosmJS Support
// STABLE VERSION - Ohne Vite Middleware Konflikte
// Port 8080 - Funktioniert mit Nodemon!
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
// REQUEST LOGGING (weniger verbose)
// ===================================
app.use((req, res, next) => {
    // Nur wichtige Requests loggen, nicht jeden Asset
    if (!req.url.includes('.css') && 
        !req.url.includes('.js') && 
        !req.url.includes('.png') && 
        !req.url.includes('.ico') &&
        !req.url.includes('.svg') &&
        !req.url.includes('/@vite/')) {
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
// ✅ MANAGEMENT ENDPOINTS (Deine APIs bleiben!)
// ===================================

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MedasDigital WebClient Stable Server',
        version: '1.2.1',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: 'stable-express-cosmjs',
        moduleSystem: 'ES Modules',
        features: {
            expressServer: true,
            viteIntegration: 'external',
            cosmjsSupport: true,
            staticFiles: true,
            blockchainProxy: false,
            directBlockchainAccess: true,
            managementAPIs: true,
            esModules: true,
            nodemonCompatible: true
        },
        endpoints: {
            health: '/api/health',
            blockchainStatus: '/api/blockchain-status',
            static: '/',
            cosmjsReady: true
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
                    'User-Agent': 'MedasDigital-Stable-Server/1.2.1'
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
        server: 'MedasDigital WebClient Stable Server',
        mode: 'stable-express-cosmjs',
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
        note: 'Blockchain APIs accessed via CosmJS from browser (stable mode)',
        viteStatus: 'Run "npm run build" then "npm start" for production, or use external Vite dev server'
    });
});

// Server Info Endpoint
app.get('/api/info', (req, res) => {
    res.json({
        server: 'MedasDigital WebClient Stable Server',
        version: '1.2.1',
        mode: 'stable-express-cosmjs',
        description: 'Stable Express server for CosmJS support (no Vite middleware conflicts)',
        architecture: {
            baseServer: 'Express.js (ES Modules)',
            frontendHandling: 'Static files + External Vite',
            blockchainLibrary: 'CosmJS (browser)',
            walletIntegration: 'Keplr',
            moduleSystem: 'ES Modules (import/export)',
            stability: 'High (no middleware conflicts)',
            benefits: [
                'Single port 8080 for APIs',
                'Stable with nodemon restarts',
                'CosmJS ES modules support',
                'No CORS issues',
                'Production-ready',
                'No Vite middleware conflicts'
            ]
        },
        usage: {
            development: 'npm run dev (Express APIs) + separate Vite if needed',
            production: 'npm run build && npm start (Express + built files)',
            apis: 'Full management APIs available',
            frontend: 'Static files or external bundler'
        }
    });
});

// ===================================
// 🎯 STATIC FILE SERVING (STABLE)
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
    res.setHeader('X-Served-By', 'MedasDigital-Stable-Server');
    res.setHeader('X-Server-Mode', 'stable-express-cosmjs');
};

// ✅ SERVE STATIC FILES (Stabil - funktioniert immer)
if (NODE_ENV === 'production') {
    // Production: Serve built files
    console.log('📦 Production mode - serving built files from dist/');
    app.use(express.static('./dist', { 
        index: 'index.html',
        setHeaders: setCustomCacheControl,
        maxAge: '1d'
    }));
} else {
    // Development: Serve source files directly
    console.log('🔧 Development mode - serving source files directly');
    app.use(express.static('./', { 
        index: 'index.html',
        setHeaders: setCustomCacheControl,
        maxAge: 0
    }));
}

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
        note: 'Blockchain APIs handled by CosmJS directly in browser',
        cosmjsSupport: true,
        serverMode: 'stable',
        timestamp: new Date().toISOString()
    });
});

// SPA ROUTING (für Single Page App)
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
        req.url.includes('.ttf') ||
        req.url.includes('.map')) {
        res.status(404).json({ 
            error: 'File not found',
            path: req.url,
            note: `Check if the file exists in the ${NODE_ENV === 'production' ? 'dist' : 'root'} directory`
        });
        return;
    }
    
    // Für alle anderen Routen, serve index.html (SPA)
    const indexPath = NODE_ENV === 'production' ? 
        path.join(__dirname, 'dist', 'index.html') : 
        path.join(__dirname, 'index.html');
    
    res.sendFile(indexPath);
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Server error:', error.message);
    
    res.status(error.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        path: req.url,
        server: 'MedasDigital Stable Server (Express + CosmJS)'
    });
});

// ===================================
// 🚀 START SERVER
// ===================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==========================================');
    console.log('🚀 MedasDigital WebClient Stable Server');
    console.log('   Express + CosmJS (Stable Mode)');
    console.log('==========================================');
    console.log('');
    console.log(`Server running at:`);
    console.log(`   📍 Local:    http://localhost:${PORT}`);
    console.log(`   🌐 Network:  http://app.medas-digital.io:${PORT}`);
    console.log('');
    console.log('🎯 STABLE MODE ACTIVE:');
    console.log(`   ✅ Express Server:   http://localhost:${PORT}/`);
    console.log(`   ✅ Health Check:     http://localhost:${PORT}/api/health`);
    console.log(`   ✅ Blockchain Test:  http://localhost:${PORT}/api/blockchain-status`);
    console.log(`   ✅ Server Info:      http://localhost:${PORT}/api/info`);
    console.log(`   ✅ Static Files:     ${NODE_ENV === 'production' ? 'dist/' : './'}`);
    
    console.log('');
    console.log('🚀 COSMJS INTEGRATION:');
    console.log('   📡 ES Modules:       Ready for browser import');
    console.log('   📡 CosmJS Library:   Via npm packages in frontend');
    console.log('   📡 LCD API:          https://lcd.medas-digital.io:1317 (direct)');
    console.log('   📡 RPC API:          https://rpc.medas-digital.io:26657 (direct)');
    
    console.log('');
    console.log('💡 DEVELOPMENT WORKFLOW:');
    console.log('   🔧 APIs:             Nodemon auto-restart (this server)');
    console.log('   🔧 Frontend:         Direct file serving OR external Vite');
    console.log('   🔧 CosmJS:           Browser imports from node_modules');
    
    console.log('');
    console.log('✅ BENEFITS:');
    console.log('   🎯 Single Port 8080 für APIs');
    console.log('   🔄 Nodemon-kompatibel (keine Restart-Konflikte)');  
    console.log('   🛠️ Osmosis-style CosmJS ready');
    console.log('   🔥 ES Modules + Browser Polyfills');
    console.log('   📊 Stable Express Server');
    console.log('   🚫 Keine Vite Middleware Konflikte');
    
    console.log('');
    console.log('🎉 Stable server ready! No more restart issues.');
    console.log('   Frontend: Load index.html with CosmJS imports');
    console.log('   APIs: Full management endpoints available');
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down MedasDigital Stable Server gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MedasDigital Stable Server gracefully...');
    process.exit(0);
});

// ===================================
// STARTUP HEALTH CHECK (weniger aggressiv)
// ===================================

setTimeout(async () => {
    try {
        console.log('🔍 Testing server health...');
        const response = await fetch(`http://localhost:${PORT}/api/health`);
        const health = await response.json();
        
        console.log(`📊 Server Mode: ${health.mode}`);
        console.log(`📊 Nodemon Compatible: ${health.features.nodemonCompatible ? 'Yes' : 'No'}`);
        console.log(`📊 CosmJS Support: ${health.features.cosmjsSupport ? 'Enabled' : 'Disabled'}`);
        
        if (health.status === 'healthy') {
            console.log('🎉 Stable server healthy - Ready for CosmJS frontend!');
        }
    } catch (error) {
        console.log('⚠️ Could not verify server health:', error.message);
    }
}, 1500); // Kürzeres Timeout
