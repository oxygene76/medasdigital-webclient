// ===================================
// MedasDigital WebClient Hybrid Server  
// Express Server + Vite Middleware + CosmJS Support
// FIXED VERSION - Mit korrektem Vite Middleware Setup
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

console.log('🚀 Starting MedasDigital Hybrid Server...');
console.log(`📊 Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`📊 Node Environment: ${NODE_ENV}`);

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
// JSON PARSING
// ===================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ===================================
// ✅ MANAGEMENT ENDPOINTS (ERSTE PRIORITÄT)
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
        }
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
            hmr: !isProduction
        }
    });
});

// ===================================
// 🔥 VITE MIDDLEWARE INTEGRATION (MIT DEBUGGING)
// ===================================

let vite;

if (!isProduction) {
    console.log('🔧 Setting up Vite middleware...');
    
    try {
        // Dynamisches Import von Vite
        const { createServer: createViteServer } = await import('vite');
        console.log('✅ Vite module imported successfully');
        
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
        
        console.log('✅ Vite server created successfully');
        
        // Vite Middleware zu Express hinzufügen
        app.use(vite.middlewares);
        
        console.log('✅ Vite middleware initialized and added to Express');
        console.log(`📡 HMR available on port ${PORT + 1}`);
        
    } catch (error) {
        console.error('❌ Failed to setup Vite middleware:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Stack:', error.stack);
        console.log('🔄 Falling back to static file serving...');
        
        // Fallback: Static files
        app.use(express.static('./', { 
            index: 'index.html',
            maxAge: 0
        }));
        
        console.log('📁 Static file fallback activated');
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
// REQUEST LOGGING (nach Vite setup)
// ===================================
app.use((req, res, next) => {
    // Nur wichtige Requests loggen, nicht jeden Asset
    if (!req.url.includes('.css') && 
        !req.url.includes('.png') && 
        !req.url.includes('.ico') &&
        !req.url.includes('.svg') &&
        !req.url.includes('/@vite/') &&
        !req.url.includes('/node_modules/')) {
        console.log(`${req.method} ${req.url} ${vite ? '(Vite)' : '(Static)'}`);
    }
    next();
});

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
        console.log(`🔥 Forwarding ${req.url} to Vite`);
        return next();
    }
    
    // In production oder bei Vite failure, serve index.html
    const indexPath = isProduction ? 
        path.join(__dirname, 'dist', 'index.html') : 
        path.join(__dirname, 'index.html');
    
    console.log(`📁 Serving index.html for ${req.url}`);
    res.sendFile(indexPath);
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error.message);
    
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
    console.log(`   ✅ Server Info:      http://localhost:${PORT}/api/info`);
    
    if (!isProduction && vite) {
        console.log(`   🔥 Vite Middleware:  ✅ ACTIVE (ES Modules + HMR)`);
        console.log(`   📡 ES Module Import: import('@cosmjs/stargate') ✅ WORKS!`);
        console.log(`   📡 /src/main.js:     ✅ AVAILABLE via Vite`);
    } else if (isProduction) {
        console.log(`   📦 Static Files:     dist/ (Vite built)`);
    } else {
        console.log(`   📁 Static Files:     ./ (fallback mode)`);
        console.log(`   ⚠️ Vite Middleware:  ❌ FAILED - Check logs above`);
    }
    
    console.log('');
    console.log('🚀 COSMJS INTEGRATION:');
    console.log('   📡 ES Modules:       ' + (!isProduction && vite ? 'Vite middleware ✅' : 'Built bundle or fallback ⚠️'));
    console.log('   📡 CosmJS Library:   ' + (!isProduction && vite ? 'import("@cosmjs/stargate") ✅' : 'Built bundle ⚠️'));
    console.log('   📡 LCD API:          https://lcd.medas-digital.io:1317 (direct)');
    console.log('   📡 RPC API:          https://rpc.medas-digital.io:26657 (direct)');
    
    console.log('');
    console.log('🔍 DEBUGGING INFO:');
    console.log('   📊 NODE_ENV:', NODE_ENV);
    console.log('   📊 isProduction:', isProduction);
    console.log('   📊 Vite Object:', vite ? '✅ Created' : '❌ Failed');
    console.log('   📊 Working Directory:', process.cwd());
    console.log('   📊 Config File:', './vite.config.js exists?', 
    
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('   1. Check server logs above for Vite errors');
    console.log('   2. Test: curl http://localhost:8080/src/main.js');
    console.log('   3. Check Browser DevTools Network tab');
    console.log('   4. Verify vite.config.js exists and is valid');
    
    console.log('');
    console.log(vite ? '🎉 Hybrid server ready with Vite!' : '⚠️ Hybrid server ready with fallback mode');
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

setTimeout(() => {
    console.log('');
    console.log('🔍 DIAGNOSTIC SUMMARY:');
    console.log('==========================================');
    
    if (vite) {
        console.log('✅ STATUS: Vite Middleware ACTIVE');
        console.log('✅ ES Modules: Available via Vite');
        console.log('✅ /src/main.js: Should load successfully');
        console.log('✅ CosmJS: import("@cosmjs/stargate") ready');
    } else {
        console.log('❌ STATUS: Vite Middleware FAILED');
        console.log('❌ ES Modules: Not available');
        console.log('❌ /src/main.js: Will return 404');
        console.log('❌ CosmJS: import() will not work');
        console.log('');
        console.log('🔧 TROUBLESHOOTING:');
        console.log('   1. Check if vite.config.js exists');
        console.log('   2. Run: npm install vite');
        console.log('   3. Check NODE_ENV environment variable');
        console.log('   4. Restart with: npm run dev');
    }
    
    console.log('==========================================');
}, 1000);
