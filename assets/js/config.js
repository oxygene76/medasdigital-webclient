// MedasDigital WebClient - Configuration

// Blockchain Configuration
const MEDAS_CHAIN_CONFIG = {
    chainId: "medasdigital-2",
    chainName: "MedasDigital",
    rpc: "https://rpc.medas-digital.io:26657",
    rest: "https://api.medas-digital.io:1317",
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
    coinType: 118,
};

// API Configuration
const API_CONFIG = {
    // Daemon Configuration
    daemon: {
        enabled: true,
        baseUrl: 'http://localhost:8080',
        fallbackUrls: [
            'http://127.0.0.1:8080',
            'http://daemon.medas-digital.io:8080'
        ],
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 2000
    },
    
    // Blockchain API Configuration
    blockchain: {
        rpc: MEDAS_CHAIN_CONFIG.rpc,
        rest: MEDAS_CHAIN_CONFIG.rest,
        timeout: 10000,
        retryAttempts: 2,
        retryDelay: 1000
    },
    
    // WebSocket Configuration
    websocket: {
        enabled: true,
        url: 'ws://localhost:8080/ws',
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
    daemon: true,
    
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

// Export configurations for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        MEDAS_CHAIN_CONFIG,
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
    // Browser environment - configurations are already in global scope
    console.log('🔧 MedasDigital WebClient Configuration Loaded');
    
    // Log feature flags if debug is enabled
    if (DEBUG_CONFIG.logging.enabled) {
        console.log('🏁 Feature Flags:', FEATURE_FLAGS);
    }
}

// Utility Functions
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
    
    // Get API URL with fallback
    getApiUrl(service = 'daemon') {
        const config = API_CONFIG[service];
        return config?.baseUrl || config?.fallbackUrls?.[0] || 'http://localhost:8080';
    },
    
    // Get theme color
    getThemeColor(color) {
        return UI_CONFIG.theme[color] || '#ffffff';
    },
    
    // Validate environment
    validateEnvironment() {
        const required = ['MEDAS_CHAIN_CONFIG', 'API_CONFIG', 'UI_CONFIG'];
        const missing = required.filter(config => !window[config]);
        
        if (missing.length > 0) {
            console.error('❌ Missing required configurations:', missing);
            return false;
        }
        
        return true;
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
