// ===================================
// MedasDigital WebClient Hybrid Server  
// Express Server + Vite Middleware + CosmJS Support
// ENHANCED VERSION - Mit Vite ES Module Support
// Port 8080 - Nodemon-kompatibel mit HMR!
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
const isProduction = NODE_ENV === 'production';

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
        !req.url.includes('/@vite/') &&
        !req.url.includes('/node_modules/')) {
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
// ✅ MANAGEMENT ENDPOINTS (Ihre APIs bleiben!)
// ===================================

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MedasDigital WebClient Hybrid Server',
        version: '1.3.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: isProduction ? 'production-express' : 'development-express-vite',
        moduleSystem: 'ES Modules + Vite',
        features: {
            expressServer: true,
            viteIntegration: !isProduction,
            viteMiddleware: !isProduction,
            cosmjsSupport: true,
            esModulesSupport: !isProduction,
            staticFiles: isProduction,
            hotReload: !isProduction,
            blockchainProxy: false,
            directBlockchainAccess: true,
            managementAPIs: true,
            nodemonCompatible: true
        },
        endpoints: {
            health: '/api/health',
            blockchainStatus: '/api/blockchain-status',
            info: '/api/info',
            static: '/',
            cosmjsReady: true,
            viteHMR: !isProduction ? `http://localhost:${PORT}/@vite/client` : false
        }
    });
});

// Blockchain Connectivity Test (bleibt gleich)
app.get('/api/blockchain-status', async (req, res) => {
    // ... Ihr bestehender Code bleibt gleich ...
    const checkEndpoint = async (url, name) => {
        try {
            const startTime = Date.now();
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'MedasDigital-Hybrid-Server/1.3.0'
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
        mode: isProduction ? 'production-express' : 'development-express-vite',
        viteActive: !isProduction,
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
        note: 'Blockchain APIs accessed via CosmJS from browser (hybrid mode)',
        cosmjsIntegration: !isProduction ? 'Vite ES Modules' : 'Built Bundle'
    });
});

// Server Info Endpoint
app.get('/api/info', (req, res) => {
    res.json({
        server: 'MedasDigital WebClient Hybrid Server',
        version: '1.3.0',
        mode: isProduction ? 'production-express' : 'development-express-vite',
        description: isProduction ? 
            'Production Express server with built files' :
            'Development Express server with Vite middleware for ES modules',
        architecture: {
            baseServer: 'Express.js (ES Modules)',
            frontendHandling: isProduction ? 'Static built files' : 'Vite middleware + HMR',
            blockchainLibrary: 'CosmJS (browser)',
            walletIntegration: 'Keplr',
            moduleSystem: 'ES Modules (import/export)',
            bundler: isProduction ? 'Vite (built)' : 'Vite (middleware)',
            stability: 'High',
            hmr: !isProduction,
            benefits: [
                'Single port 8080 for APIs + Frontend',
                'Nodemon-kompatibel (Express restart, Vite weiter)',
                'CosmJS ES modules support via Vite',
                'No CORS issues',
                'Hot Module Reload in development',
                'Production-ready builds'
            ]
        },
        usage: {
            development: 'npm run dev (Express + Vite middleware)',
            production: 'npm run build && npm start (Express + built files)',
            apis: 'Full management APIs available',
            frontend: isProduction ? 'Vite built bundle' : 'Vite middleware with HMR'
        }
    });
});

// ===================================
// 🔥 VITE MIDDLEWARE INTEGRATION
// ===================================

let vite;

if (!isProduction) {
    console.log('🔧 Setting up Vite middleware...');
    
    try {
        // Dynamisches Import von Vite
        const { createServer: createViteServer } = await import('vite');
        
        // Vite Server mit Middleware Mode erstellen
        vite = await createViteServer({
            server: { 
                middlewareMode: true,
                hmr: {
                    port: PORT + 1 // HMR auf Port 8081
                }
            },
            appType: 'spa',
            root: process.cwd(),
            configFile: './vite.config.js',
            logLevel: 'info'
        });
        
        // Vite Middleware zu Express hinzufügen
        app.use(vite.middlewares);
        
        console.log('✅ Vite middleware initialized');
        console.log(`📡 HMR available on port ${PORT + 1}`);
        
    } catch (error) {
        console.error('❌ Failed to setup Vite middleware:', error.message);
        console.log('🔄 Falling back to static file serving...');
        
        // Fallback: Static files
        app.use(express.static('./', { 
            index: 'index.html',
            maxAge: 0
        }));
    }
    
} else {
    // Production: Serve built files
    console.log('📦 Production mode - serving built files from dist/');
    app.use(express.static('./dist', { 
        index: 'index.html',
        maxAge: '1d'
    }));
}

// ===================================
// ERROR HANDLING (bleibt gleich)
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
        serverMode: isProduction ? 'production' : 'development-vite',
        timestamp: new Date().toISOString()
    });
});

// SPA ROUTING (angepasst für Vite)
app.get('*', (req, res, next) => {
    // In development mit Vite middleware, weiter zu Vite
    if (!isProduction && vite) {
        return next();
    }
    
    // In production oder bei Vite failure, serve index.html
    const indexPath = isProduction ? 
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
        server: 'MedasDigital Hybrid Server (Express + Vite)'
    });
});

// ===================================
// 🚀 START SERVER
// ===================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==========================================');
    console.log('🚀 MedasDigital WebClient Hybrid Server');
    console.log('   Express + Vite + CosmJS');
    console.log('==========================================');
    console.log('');
    console.log(`Server running at:`);
    console.log(`   📍 Local:    http://localhost:${PORT}`);
    console.log(`   🌐 Network:  http://app.medas-digital.io:${PORT}`);
    
    if (!isProduction) {
        console.log(`   🔥 HMR:      http://localhost:${PORT + 1} (Hot Module Reload)`);
    }
    
    console.log('');
    console.log('🎯 HYBRID MODE ACTIVE:');
    console.log(`   ✅ Express Server:   http://localhost:${PORT}/`);
    console.log(`   ✅ Health Check:     http://localhost:${PORT}/api/health`);
    console.log(`   ✅ Blockchain Test:  http://localhost:${PORT}/api/blockchain-status`);
    console.log(`   ✅ Server Info:      http://localhost:${PORT}/api/info`);
    
    if (!isProduction && vite) {
        console.log(`   🔥 Vite Middleware:  Active (ES Modules + HMR)`);
        console.log(`   📡 ES Module Import: import('@cosmjs/stargate') works!`);
    } else if (isProduction) {
        console.log(`   📦 Static Files:     dist/ (Vite built)`);
    } else {
        console.log(`   📁 Static Files:     ./ (fallback mode)`);
    }
    
    console.log('');
    console.log('🚀 COSMJS INTEGRATION:');
    console.log('   📡 ES Modules:       ' + (!isProduction ? 'Vite middleware' : 'Built bundle'));
    console.log('   📡 CosmJS Library:   ' + (!isProduction ? 'import("@cosmjs/stargate")' : 'Built bundle'));
    console.log('   📡 LCD API:          https://lcd.medas-digital.io:1317 (direct)');
    console.log('   📡 RPC API:          https://rpc.medas-digital.io:26657 (direct)');
    
    console.log('');
    console.log('💡 DEVELOPMENT WORKFLOW:');
    console.log('   🔧 APIs:             Nodemon auto-restart (Express)');
    console.log('   🔧 Frontend:         ' + (!isProduction ? 'Vite HMR (instant updates)' : 'Static built files'));
    console.log('   🔧 CosmJS:           ' + (!isProduction ? 'ES Module imports via Vite' : 'Built bundle'));
    
    console.log('');
    console.log('✅ BENEFITS:');
    console.log('   🎯 Single Port 8080 (APIs + Frontend)');
    console.log('   🔄 Nodemon-kompatibel');  
    console.log('   🛠️ Osmosis-style CosmJS ready');
    console.log('   🔥 ' + (!isProduction ? 'Hot Module Reload' : 'Optimized production build'));
    console.log('   📊 Express + Vite Hybrid');
    console.log('   🚀 ES Modules + Browser Polyfills');
    
    console.log('');
    console.log('🎉 Hybrid server ready!');
    console.log('   Frontend: ' + (!isProduction ? 'Vite middleware with HMR' : 'Built files'));
    console.log('   APIs: Full management endpoints');
    console.log('   CosmJS: ' + (!isProduction ? 'ES modules via Vite' : 'Built bundle'));
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down MedasDigital Hybrid Server gracefully...');
    
    if (vite) {
        console.log('🔥 Closing Vite server...');
        await vite.close();
    }
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down MedasDigital Hybrid Server gracefully...');
    
    if (vite) {
        console.log('🔥 Closing Vite server...');
        await vite.close();
    }
    
    process.exit(0);
});

// ===================================
// STARTUP HEALTH CHECK
// ===================================

setTimeout(async () => {
    try {
        console.log('🔍 Testing hybrid server health...');
        const response = await fetch(`http://localhost:${PORT}/api/health`);
        const health = await response.json();
        
        console.log(`📊 Server Mode: ${health.mode}`);
        console.log(`📊 Vite Integration: ${health.features.viteIntegration ? 'Active' : 'Disabled'}`);
        console.log(`📊 ES Modules Support: ${health.features.esModulesSupport ? 'Yes' : 'No'}`);
        console.log(`📊 CosmJS Support: ${health.features.cosmjsSupport ? 'Enabled' : 'Disabled'}`);
        
        if (health.status === 'healthy') {
            console.log('🎉 Hybrid server healthy - Ready for CosmJS ES modules!');
            
            if (!isProduction) {
                console.log('💡 Try in browser console: import("@cosmjs/stargate")');
            }
        }
    } catch (error) {
        console.log('⚠️ Could not verify server health:', error.message);
    }
}, 2000);
