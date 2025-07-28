// ===================================
// server.js - SIMPLIFIED (ohne Vite)
// Nur Express Static File Server
// WeedWallet-Pattern für MedasDigital
// ===================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// ===================================
// MIDDLEWARE
// ===================================

// CORS für alle Origins (Development-friendly)
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Files (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname), {
    maxAge: isProduction ? '1d' : '0', // Cache in production
    etag: true,
    lastModified: true
}));

// ===================================
// API ROUTES
// ===================================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: 'simple-express',
        environment: isProduction ? 'production' : 'development',
        features: {
            staticFiles: true,
            cosmjsCDN: true,
            keplrIntegration: true,
            weedwalletPattern: true,
            vite: false,
            buildProcess: false
        }
    });
});

// Server Info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'MedasDigital WebClient',
        version: '0.9.0',
        mode: 'Simple Express Server',
        cosmjs: 'CDN (WeedWallet-Pattern)',
        buildTool: 'None (Direct)',
        architecture: {
            server: 'Express.js',
            frontend: 'Static HTML/CSS/JS',
            cosmjs: 'ESM.sh CDN',
            wallet: 'Keplr Direct',
            pattern: 'WeedWallet-inspired'
        },
        dependencies: {
            vite: false,
            webpack: false,
            bundler: 'None',
            complexity: 'Minimal'
        }
    });
});

// Version Info
app.get('/api/version', (req, res) => {
    res.json({
        version: '0.9.0',
        build: 'simplified',
        cosmjs: 'esm.sh CDN',
        pattern: 'WeedWallet',
        vite: false
    });
});

// ===================================
// ERROR HANDLING
// ===================================

// 404 Handler für API Routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        availableEndpoints: ['/api/health', '/api/info', '/api/version'],
        note: 'Blockchain APIs handled by CosmJS directly in browser'
    });
});

// ===================================
// SPA FALLBACK (alle anderen Routen zu index.html)
// ===================================

app.get('*', (req, res) => {
    // Sende immer index.html für SPA-Routing
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Internal Server Error');
        }
    });
});

// ===================================
// ERROR HANDLING MIDDLEWARE
// ===================================

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: isProduction ? 'Something went wrong' : err.message
    });
});

// ===================================
// SERVER START
// ===================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('==========================================');
    console.log('🚀 MedasDigital WebClient - SIMPLIFIED');
    console.log('   WeedWallet-Pattern Implementation');
    console.log('==========================================');
    console.log(`📍 Local:    http://localhost:${PORT}`);
    console.log(`🌐 Network:  http://app.medas-digital.io:${PORT}`);
    console.log('==========================================');
    console.log('✅ FEATURES ACTIVE:');
    console.log('   📁 Static File Serving');
    console.log('   🌐 CosmJS via ESM CDN');
    console.log('   💳 Direct Keplr Integration');
    console.log('   🚀 WeedWallet-Pattern Staking');
    console.log('   🔄 No Build Process Required');
    console.log('   ❌ No Vite Complexity');
    console.log('==========================================');
    console.log('🎯 SIMPLIFIED ARCHITECTURE:');
    console.log('   ❌ No Vite');
    console.log('   ❌ No Webpack');
    console.log('   ❌ No Module Bundling');
    console.log('   ❌ No Build Steps');
    console.log('   ✅ Direct Browser Loading');
    console.log('   ✅ ESM CDN Imports');
    console.log('   ✅ Immediate Development');
    console.log('==========================================');
    
    if (!isProduction) {
        console.log('💡 DEVELOPMENT MODE:');
        console.log('   - No caching');
        console.log('   - Live reload via nodemon');
        console.log('   - Full error messages');
        console.log('   - Debug output enabled');
        console.log('');
        console.log('🧪 TEST IN BROWSER:');
        console.log('   window.cosmjsReady');
        console.log('   window.stakingManager');
        console.log('   window.delegateTokens()');
        console.log('');
        console.log('🔍 TROUBLESHOOTING:');
        console.log('   - Check browser console for CosmJS loading');
        console.log('   - Verify Keplr extension is installed');
        console.log('   - Test wallet connection first');
    }
    
    console.log('==========================================');
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});
