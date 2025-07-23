// MedasDigital WebClient - Configuration
// ✅ HYBRID-LÖSUNG: Direkte Blockchain APIs + Express Static Files

// ===================================
// 1. KEPLR CHAIN CONFIG (DIREKTE ENDPOINTS)
// ===================================

const KEPLR_CHAIN_CONFIG = {
    chainId: "medasdigital-2",
    chainName: "MedasDigital",
    // ✅ DIREKTE ENDPOINTS für Keplr (kein CORS-Problem)
    rpc: "https://rpc.medas-digital.io:26657",
    rest: "https://lcd.medas-digital.io:1317",
    bip44: {
        coinType: 118,
    },
    bech32Config: {
        bech32PrefixAccAddr: "medas",
        bech32PrefixAccPub: "medaspub",
        bech32PrefixValAddr: "medasvaloper",
        bech32PrefixValPub: "medasvaloperpub",
        bech32PrefixConsAddr: "medasvalcons",
        bech32PrefixConsPub: "medasvalconspub",
    },
    currencies: [
        {
            coinDenom: "MEDAS",
            coinMinimalDenom: "umedas",
            coinDecimals: 6,
            coinGeckoId: "medas-digital",
        },
    ],
    feeCurrencies: [
        {
            coinDenom: "MEDAS",
            coinMinimalDenom: "umedas",
            coinDecimals: 6,
            coinGeckoId: "medas-digital",
            gasPriceStep: {
                low: 0.01,
                average: 0.025,
                high: 0.04,
            },
        },
    ],
    stakeCurrency: {
        coinDenom: "MEDAS",
        coinMinimalDenom: "umedas",
        coinDecimals: 6,
        coinGeckoId: "medas-digital",
    },
    // ✅ KEINE deprecated features
    features: [
        "cosmwasm",
        "ibc-transfer", 
        "ibc-go"
    ],
    txExplorer: {
        name: "Medas Explorer", 
        txUrl: "https://explorer.medas-digital.io/tx/{txHash}"
    },
    gas: {
        defaults: {
            delegate: 250000,
            undelegate: 300000,
            redelegate: 350000,
            claimRewards: 150000,
            send: 80000
        },
        multiplier: 1.3
    }
};

// ===================================
// 2. WEBCLIENT API CONFIG (HYBRID: DIREKTE ENDPOINTS)
// ===================================

const WEBCLIENT_API_CONFIG = {
    // ✅ DIREKTE ENDPOINTS (keine Proxy mehr für Hybrid-Lösung!)
    rpc: "https://rpc.medas-digital.io:26657",   // ← Direkt zur Blockchain!
    rest: "https://lcd.medas-digital.io:1317",   // ← Direkt zur Blockchain!
    chainId: "medasdigital-2"
};

// ===================================
// 3. MEDAS_CHAIN_CONFIG (HAUPTKONFIGURATION)
// ===================================

const MEDAS_CHAIN_CONFIG = {
    ...KEPLR_CHAIN_CONFIG,
    // ✅ Verwende direkte APIs (beide gleich für Hybrid-Lösung):
    rpc: KEPLR_CHAIN_CONFIG.rpc,    // Direkt: https://rpc.medas-digital.io:26657
    rest: KEPLR_CHAIN_CONFIG.rest   // Direkt: https://lcd.medas-digital.io:1317
};

// API Configuration
const API_CONFIG = {
    // Daemon Configuration (DEAKTIVIERT für Hybrid-Lösung)
    daemon: {
        enabled: false,  // ✅ DAEMON DEAKTIVIERT!
        baseUrl: 'https://localhost:8080',  // HTTPS für Mixed Content
        fallbackUrls: [
            'https://127.0.0.1:8080',       // HTTPS für Mixed Content
            'https://daemon.medas-digital.io:8080'  // HTTPS für Mixed Content
        ],
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 2000
    },
    
    // Blockchain API Configuration
    blockchain: {
        rpc: MEDAS_CHAIN_CONFIG.rpc,    // Direkt: https://rpc.medas-digital.io:26657
        rest: MEDAS_CHAIN_CONFIG.rest,  // Direkt: https://lcd.medas-digital.io:1317
        timeout: 10000,
        retryAttempts: 2,
        retryDelay: 1000
    },
    
    // WebSocket Configuration (DEAKTIVIERT für Hybrid-Lösung)
    websocket: {
        enabled: false,  // ✅ WEBSOCKET DEAKTIVIERT!
        url: 'wss://localhost:8080/ws',  // WSS für Mixed Content (falls später aktiviert)
        reconnectAttempts: 5,
        reconnectDelay: 3000,
        heartbeatInterval: 30000
    }
};

// UI Configuration
const UI_CONFIG = {
    // Terminal Configuration
    terminal: {
        maxMessages: 1000,
        messageDisplayLimit: 500,
        autoScroll: true,
        timestampFormat: 'HH:mm:ss',
        animationSpeed: 'normal'
    },
    
    // Theme Configuration
    theme: {
        primary: '#0a0a0a',
        secondary: '#1a1a1a',
        accent: '#00ffff',
        success: '#00ff00',
        warning: '#ffaa00',
        error: '#ff3030',
        text: '#ffffff'
    },
    
    // Animation Configuration
    animation: {
        enabled: true,
        solarSystemSpeed: 1.0,
        reduceMotion: false,
        particleEffects: true
    },
    
    // Mobile Configuration
    mobile: {
        touchGestures: true,
        swipeNavigation: true,
        hapticFeedback: true,
        bottomNavigation: false
    }
};

// Registration Configuration
const REGISTRATION_CONFIG = {
    // Registration Types
    types: {
        simple: {
            name: 'Simple Registration',
            fee: '0.1', // MEDAS
            features: [
                'Basic message routing',
                'Standard relay selection',
                'Transaction-based proof'
            ]
        },
        enhanced: {
            name: 'Enhanced Registration',
            fee: '0.25', // MEDAS
            features: [
                'Advanced routing options',
                'Custom relay selection',
                'Geographic optimization',
                'Backup relay configuration',
                'Priority message handling'
            ]
        }
    },
    
    // Default Relay Configuration
    relays: {
        default: [
            'relay.medas-digital.io',
            'backup-relay.medas-digital.io'
        ],
        regions: {
            'US': ['relay-us-east.medas-digital.io', 'relay-us-west.medas-digital.io'],
            'EU': ['relay-eu-central.medas-digital.io', 'relay-eu-west.medas-digital.io'],
            'AS': ['relay-asia-pacific.medas-digital.io', 'relay-asia-south.medas-digital.io']
        }
    },
    
    // Gas Configuration
    gas: {
        registrationGas: '200000',
        gasPrice: '0.025umedas',
        feeMultiplier: 1.2
    }
};

// Wallet Configuration
const WALLET_CONFIG = {
    // Keplr Configuration
    keplr: {
        detection: {
            maxRetries: 50,
            retryDelay: 100,
            timeout: 5000
        },
        connection: {
            autoConnect: false,
            chainSuggestion: true,
            accountChangeListening: true
        }
    },
    
    // Mobile Wallet Configuration
    mobile: {
        keplrApp: {
            ios: {
                scheme: 'keplrwallet://',
                appStore: 'https://apps.apple.com/app/keplr/id1567851089'
            },
            android: {
                intent: 'intent://wallet#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end',
                playStore: 'https://play.google.com/store/apps/details?id=com.chainapsis.keplr'
            }
        },
        walletConnect: {
            enabled: false, // For future implementation
            projectId: '', // WalletConnect project ID
            chains: ['cosmos:medasdigital-2']
        }
    }
};

// Network Configuration
const NETWORK_CONFIG = {
    // Status Check Configuration
    status: {
        checkInterval: 30000, // 30 seconds
        timeoutThreshold: 5000, // 5 seconds
        offlineThreshold: 10000 // 10 seconds
    },
    
    // Health Check Endpoints
    healthCheck: {
        blockchain: '/health',
        daemon: '/api/health',
        relay: '/relay/health'
    },
    
    // Network Monitoring
    monitoring: {
        latencyTracking: true,
        blockHeightTracking: true,
        nodeVersionTracking: true,
        peerCountTracking: false
    }
};

// Security Configuration
const SECURITY_CONFIG = {
    // CORS Configuration
    cors: {
        allowedOrigins: [
            'http://localhost:8000',
            'http://127.0.0.1:8000',
            'https://medas-digital.io',
            'https://*.medas-digital.io'
        ]
    },
    
    // CSP Configuration
    csp: {
        enabled: false, // Set by server
        reportUri: '/csp-report'
    },
    
    // Input Validation
    validation: {
        maxMessageLength: 10000,
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['txt', 'pdf', 'jpg', 'png', 'gif']
    }
};

// Debug Configuration
const DEBUG_CONFIG = {
    // Console Logging
    logging: {
        enabled: true,
        level: 'info', // 'debug', 'info', 'warn', 'error'
        categories: {
            blockchain: true,
            wallet: true,
            daemon: true,
            ui: true,
            registration: true
        }
    },
    
    // Performance Monitoring
    performance: {
        enabled: false,
        trackingInterval: 10000,
        memoryMonitoring: false
    },
    
    // Error Reporting
    errorReporting: {
        enabled: false,
        endpoint: '/api/errors',
        includeStack: true
    }
};

// Feature Flags
const FEATURE_FLAGS = {
    // Core Features
    blockchain: true,
    wallet: true,
    registration: true,
    daemon: false,  // ✅ DAEMON DEAKTIVIERT für Hybrid-Lösung
    
    // UI Features
    solarSystem: true,
    mobileOptimization: true,
    darkMode: true,
    animations: true,
    
    // Experimental Features
    walletConnect: false,
    pushNotifications: false,
    offlineMode: false,
    voiceMessages: false,
    fileSharing: false,
    
    // Debug Features
    devTools: false,
    performanceMonitor: false,
    networkDebug: false
};

// ===================================
// 🔧 HYBRID-LÖSUNG FUNCTIONS
// ===================================

// CORS Compatibility Check (AKTUALISIERT für Hybrid)
window.checkCorsConfiguration = function() {
    console.log('🔍 HYBRID CONFIGURATION CHECK:');
    console.log('==============================');
    console.log('Keplr endpoints (direct):', {
        rpc: KEPLR_CHAIN_CONFIG.rpc,
        rest: KEPLR_CHAIN_CONFIG.rest
    });
    console.log('WebClient endpoints (direct - hybrid):', {
        rpc: WEBCLIENT_API_CONFIG.rpc,
        rest: WEBCLIENT_API_CONFIG.rest
    });
    console.log('MEDAS_CHAIN_CONFIG (unified direct):', {
        rpc: MEDAS_CHAIN_CONFIG.rpc,
        rest: MEDAS_CHAIN_CONFIG.rest
    });
    
    return {
        keplrDirect: !KEPLR_CHAIN_CONFIG.rest.includes('8080'),
        webClientDirect: !WEBCLIENT_API_CONFIG.rest.includes('8080'),
        hybridMode: !KEPLR_CHAIN_CONFIG.rest.includes('8080') && !WEBCLIENT_API_CONFIG.rest.includes('8080'),
        daemonEnabled: FEATURE_FLAGS.daemon,
        mode: 'hybrid-direct-blockchain-access'
    };
};

// Test Blockchain Endpoints (AKTUALISIERT für Hybrid)
window.testCorsEndpoints = async function() {
    console.log('🧪 TESTING HYBRID BLOCKCHAIN ENDPOINTS...');
    
    const tests = [
        {
            name: 'Direct RPC Status',
            url: KEPLR_CHAIN_CONFIG.rpc + '/status'
        },
        {
            name: 'Direct LCD Node Info',
            url: KEPLR_CHAIN_CONFIG.rest + '/cosmos/base/tendermint/v1beta1/node_info'
        },
        {
            name: 'Direct LCD Staking Pool',
            url: KEPLR_CHAIN_CONFIG.rest + '/cosmos/staking/v1beta1/pool'
        },
        {
            name: 'Direct LCD Validators',
            url: KEPLR_CHAIN_CONFIG.rest + '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED'
        }
    ];
    
    const results = [];
    
    for (const test of tests) {
        try {
            const startTime = Date.now();
            const response = await fetch(test.url, { 
                signal: AbortSignal.timeout(10000)  // 10 Sekunden für direkte APIs
            });
            const endTime = Date.now();
            
            results.push({
                name: test.name,
                url: test.url,
                status: response.ok ? 'SUCCESS' : `FAILED (${response.status})`,
                working: response.ok,
                responseTime: `${endTime - startTime}ms`
            });
            console.log(`${response.ok ? '✅' : '❌'} ${test.name}: ${response.ok ? 'SUCCESS' : 'FAILED'} (${endTime - startTime}ms)`);
        } catch (error) {
            results.push({
                name: test.name,
                url: test.url,
                status: `ERROR (${error.message})`,
                working: false,
                responseTime: 'timeout'
            });
            console.log(`❌ ${test.name}: ${error.message}`);
        }
    }
    
    const workingCount = results.filter(r => r.working).length;
    console.log(`📊 Results: ${workingCount}/${results.length} endpoints working`);
    
    return results;
};

// Keplr Compatibility Check (AKTUALISIERT)
window.checkKeplrCompatibility = function() {
    console.log('🔍 KEPLR COMPATIBILITY CHECK (HYBRID MODE):');
    console.log('Keplr version:', window.keplr?.version || 'unknown');
    console.log('Keplr mode:', window.keplr?.mode || 'unknown');
    console.log('experimentalSignTx available:', !!window.keplr?.experimentalSignTx);
    console.log('sendTx available:', !!window.keplr?.sendTx);
    console.log('signAmino available:', !!window.keplr?.signAmino);
    
    // Test Chain Info
    const chainInfo = MEDAS_CHAIN_CONFIG;
    console.log('Chain config features:', chainInfo.features);
    console.log('Chain config gas defaults:', chainInfo.gas?.defaults);
    
    // ✅ Hybrid Check
    const hybridCheck = window.checkCorsConfiguration();
    console.log('Hybrid configuration:', hybridCheck);
    
    return {
        version: window.keplr?.version,
        modern: !!window.keplr?.experimentalSignTx,
        legacy: !!window.keplr?.sendTx,
        hybridMode: hybridCheck.hybridMode,
        daemonEnabled: hybridCheck.daemonEnabled,
        recommended: hybridCheck.hybridMode ? 
            '🎉 Hybrid mode active - direct blockchain access!' : 
            '⚠️ Configuration issue detected'
    };
};

// Export configurations for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        MEDAS_CHAIN_CONFIG,
        KEPLR_CHAIN_CONFIG,
        WEBCLIENT_API_CONFIG,
        API_CONFIG,
        UI_CONFIG,
        REGISTRATION_CONFIG,
        WALLET_CONFIG,
        NETWORK_CONFIG,
        SECURITY_CONFIG,
        DEBUG_CONFIG,
        FEATURE_FLAGS
    };
} else {
    // Browser environment - make configs globally available
    window.MEDAS_CHAIN_CONFIG = MEDAS_CHAIN_CONFIG;
    window.KEPLR_CHAIN_CONFIG = KEPLR_CHAIN_CONFIG;
    window.WEBCLIENT_API_CONFIG = WEBCLIENT_API_CONFIG;
    
    console.log('🔧 MedasDigital WebClient Configuration Loaded');
    console.log('🚀 HYBRID MODE: Direct Blockchain Access + Express Static Files');
    
    // Log feature flags if debug is enabled
    if (DEBUG_CONFIG.logging.enabled) {
        console.log('🏁 Feature Flags:', FEATURE_FLAGS);
        console.log('🎯 Daemon Enabled:', FEATURE_FLAGS.daemon);
    }
}

// Utility Functions (AKTUALISIERT für Hybrid)
const ConfigUtils = {
    // Get configuration value with fallback
    get(path, fallback = null) {
        const keys = path.split('.');
        let current = window;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return fallback;
            }
        }
        
        return current;
    },
    
    // Check if feature is enabled
    isFeatureEnabled(feature) {
        return FEATURE_FLAGS[feature] === true;
    },
    
    // Get API URL with fallback (AKTUALISIERT für Hybrid)
    getApiUrl(service = 'blockchain') {
        if (service === 'blockchain') {
            return {
                rpc: MEDAS_CHAIN_CONFIG.rpc,
                rest: MEDAS_CHAIN_CONFIG.rest
            };
        }
        
        const config = API_CONFIG[service];
        return config?.baseUrl || config?.fallbackUrls?.[0] || 'https://localhost:8080';
    },
    
    // Get theme color
    getThemeColor(color) {
        return UI_CONFIG.theme[color] || '#ffffff';
    },
    
    // Get Gas Configuration
    getGasConfig(txType = 'delegate') {
        const gasDefaults = MEDAS_CHAIN_CONFIG.gas?.defaults || {};
        const multiplier = MEDAS_CHAIN_CONFIG.gas?.multiplier || 1.3;
        const baseGas = gasDefaults[txType] || 250000;
        
        return {
            gas: Math.floor(baseGas * multiplier).toString(),
            gasPrice: MEDAS_CHAIN_CONFIG.feeCurrencies[0].gasPriceStep.average,
            fee: Math.floor(baseGas * multiplier * MEDAS_CHAIN_CONFIG.feeCurrencies[0].gasPriceStep.average).toString()
        };
    },
    
    // ✅ Get correct config for context
    getKeplrConfig() {
        return KEPLR_CHAIN_CONFIG;
    },
    
    getWebClientConfig() {
        return WEBCLIENT_API_CONFIG;
    },
    
    // Validate environment (AKTUALISIERT)
    validateEnvironment() {
        const required = ['MEDAS_CHAIN_CONFIG', 'KEPLR_CHAIN_CONFIG', 'WEBCLIENT_API_CONFIG'];
        const missing = required.filter(config => !window[config]);
        
        if (missing.length > 0) {
            console.error('❌ Missing required configurations:', missing);
            return false;
        }
        
        // Hybrid-spezifische Validierung
        const isHybrid = !MEDAS_CHAIN_CONFIG.rpc.includes('8080');
        console.log('🎯 Hybrid mode detected:', isHybrid);
        
        return true;
    },
    
    // ✅ NEU: Check Hybrid Status
    getHybridStatus() {
        return {
            mode: 'hybrid',
            staticFiles: 'Express Server',
            blockchainAPIs: 'Direct Access',
            daemon: FEATURE_FLAGS.daemon ? 'Enabled' : 'Disabled',
            websocket: API_CONFIG.websocket.enabled ? 'Enabled' : 'Disabled',
            proxyRoutes: false,
            directBlockchain: true
        };
    }
};

// Environment Detection
const Environment = {
    isMobile: () => window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: () => /Android/.test(navigator.userAgent),
    isKeplrMobile: () => /Keplr/i.test(navigator.userAgent),
    isPWA: () => window.matchMedia('(display-mode: standalone)').matches,
    isDarkMode: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    isReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isOnline: () => navigator.onLine,
    
    // Browser Detection
    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'chrome';
        if (userAgent.includes('Firefox')) return 'firefox';
        if (userAgent.includes('Safari')) return 'safari';
        if (userAgent.includes('Edge')) return 'edge';
        return 'unknown';
    },
    
    // Device Info
    getDeviceInfo() {
        return {
            mobile: this.isMobile(),
            ios: this.isIOS(),
            android: this.isAndroid(),
            keplrMobile: this.isKeplrMobile(),
            pwa: this.isPWA(),
            darkMode: this.isDarkMode(),
            reducedMotion: this.isReducedMotion(),
            online: this.isOnline(),
            browser: this.getBrowser(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio || 1
            }
        };
    }
};

// Make utilities globally available
window.ConfigUtils = ConfigUtils;
window.Environment = Environment;
