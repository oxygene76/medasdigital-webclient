// MedasDigital WebClient - Main Application Class

class MedasResearchTerminal {
    constructor() {
        this.keplr = null;
        this.keplrManager = new KeplrManager();
        this.account = null;
        this.connected = false;
        this.daemonUrl = null;
        this.daemonConnected = false;
        this.websocket = null;
        this.blockchainOnline = false;
        this.currentBlock = 0;
        this.networkLatency = 0;
        this.activeTab = 'comm';
        this.contacts = new Map();
        this.messageHistory = new Map();
        this.channels = new Map();
        this.blockchainStatusLogged = false;
        
        // NEW: Wallet Header Elements
        this.walletDisplayElement = null;
        this.walletStatusElement = null;
        this.walletAddressElement = null;
        this.addressTextElement = null;
        this.copyButtonElement = null;
        
        // Initialize UI Manager
        this.ui = new UIManager();
        
        this.initializeTerminal();
        this.initializeEventListeners();
        // NEW: Initialize Wallet Header
        this.initializeWalletHeader();
        this.checkKeplrAvailability();
        this.checkDaemonConnection();
        this.startBlockchainMonitoring();
    }

    initializeTerminal() {
        // UI Manager handles starfield, timestamp, and boot messages
        console.log('🚀 MedasDigital Research Terminal v0.9 initializing...');
    }

    initializeEventListeners() {
        // Setup global action handlers
        window.delegateTokens = () => this.delegateTokens();
        window.setMaxStakeAmount = () => this.ui.setMaxStakeAmount();
        window.setMaxSendAmount = () => this.ui.setMaxSendAmount();
        window.sendTokens = () => this.sendTokens();
    }

    // ERSETZE diese Funktion in main.js (ca. Zeile 50-100):

// ERSETZE die initializeWalletHeader() Funktion in main.js mit dieser VOLLSTÄNDIGEN Version:

// Initialize Wallet Header Display - DESKTOP + MOBILE VOLLSTÄNDIG
initializeWalletHeader() {
    try {
        // ===================================
        // CONTROL PANEL ELEMENTS (bestehend)
        // ===================================
        this.walletDisplayElement = document.getElementById('wallet-display');
        this.walletStatusElement = document.getElementById('wallet-status');
        this.walletAddressElement = document.getElementById('wallet-address');
        this.addressTextElement = document.getElementById('address-text');
        this.copyButtonElement = document.getElementById('copy-address');

        // ===================================
        // DESKTOP HEADER ELEMENTS
        // ===================================
        this.headerWalletDisplayElement = document.querySelector('.header-wallet-display');
        this.headerWalletStatusElement = this.headerWalletDisplayElement?.querySelector('.wallet-status');
        this.headerWalletAddressElement = this.headerWalletDisplayElement?.querySelector('.wallet-address');
        this.headerAddressTextElement = this.headerWalletDisplayElement?.querySelector('.address-text');
        this.headerCopyButtonElement = this.headerWalletDisplayElement?.querySelector('.copy-btn');

        // ===================================
        // MOBILE WALLET ELEMENTS (NEU!)
        // ===================================
        // Suche nach dem Mobile Wallet Element in der Wallet-Section
        this.mobileWalletDisplayElement = document.querySelector('.wallet-section .wallet-display');
        this.mobileWalletStatusElement = this.mobileWalletDisplayElement?.querySelector('.wallet-status');
        this.mobileWalletAddressElement = this.mobileWalletDisplayElement?.querySelector('.wallet-address');
        this.mobileAddressTextElement = this.mobileWalletDisplayElement?.querySelector('.address-text');
        this.mobileCopyButtonElement = this.mobileWalletDisplayElement?.querySelector('.copy-btn');

        // ===================================
        // DEBUG LOGGING
        // ===================================
        console.log('🔍 DEBUG - Wallet Elements Found:');
        console.log('  Control Panel Elements:');
        console.log('    walletDisplayElement:', this.walletDisplayElement);
        console.log('    walletStatusElement:', this.walletStatusElement);
        console.log('    walletAddressElement:', this.walletAddressElement);
        console.log('    addressTextElement:', this.addressTextElement);
        console.log('    copyButtonElement:', this.copyButtonElement);
        console.log('  Desktop Header Elements:');
        console.log('    headerWalletDisplayElement:', this.headerWalletDisplayElement);
        console.log('    headerWalletStatusElement:', this.headerWalletStatusElement);
        console.log('    headerWalletAddressElement:', this.headerWalletAddressElement);
        console.log('    headerAddressTextElement:', this.headerAddressTextElement);
        console.log('    headerCopyButtonElement:', this.headerCopyButtonElement);
        console.log('  Mobile Elements (NEU):');
        console.log('    mobileWalletDisplayElement:', this.mobileWalletDisplayElement);
        console.log('    mobileWalletStatusElement:', this.mobileWalletStatusElement);
        console.log('    mobileWalletAddressElement:', this.mobileWalletAddressElement);
        console.log('    mobileAddressTextElement:', this.mobileAddressTextElement);
        console.log('    mobileCopyButtonElement:', this.mobileCopyButtonElement);

        // ===================================
        // EVENT LISTENERS - CONTROL PANEL
        // ===================================
        if (this.copyButtonElement) {
            this.copyButtonElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyWalletAddress();
            });
        }

        if (this.addressTextElement) {
            this.addressTextElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyWalletAddress();
            });
        }

        // ===================================
        // EVENT LISTENERS - DESKTOP HEADER
        // ===================================
        if (this.headerWalletDisplayElement) {
            this.headerWalletDisplayElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔗 Desktop Header Button clicked!');
                this.handleWalletClick('desktop-header');
            });
            
            console.log('✅ Desktop Header Button click handler added');
        } else {
            console.warn('⚠️ Desktop Header Button (.header-wallet-display) not found in DOM');
        }

        if (this.headerCopyButtonElement) {
            this.headerCopyButtonElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyWalletAddress();
            });
        }

        if (this.headerAddressTextElement) {
            this.headerAddressTextElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyWalletAddress();
            });
        }

        // ===================================
        // EVENT LISTENERS - MOBILE WALLET (NEU!)
        // ===================================
        if (this.mobileWalletDisplayElement) {
            this.mobileWalletDisplayElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('📱 Mobile Wallet Button clicked!');
                this.handleWalletClick('mobile');
            });
            
            console.log('✅ Mobile Wallet Button click handler added');
        } else {
            console.warn('⚠️ Mobile Wallet Button (.wallet-section .wallet-display) not found in DOM');
        }

        if (this.mobileCopyButtonElement) {
            this.mobileCopyButtonElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyWalletAddress();
            });
        }

        if (this.mobileAddressTextElement) {
            this.mobileAddressTextElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyWalletAddress();
            });
        }

        console.log('✅ Wallet header initialized successfully');
        
        // Update initial state
        this.updateWalletHeader();
        
    } catch (error) {
        console.error('❌ Wallet header initialization failed:', error);
    }
}

// ===================================
// WALLET CLICK HANDLER (NEU!)
// ===================================
handleWalletClick(source) {
    console.log(`🔗 Wallet clicked from: ${source}`);
    
    if (this.connected && this.account) {
        console.log('📱 Already connected, showing wallet options');
        this.showWalletOptions();
    } else {
        console.log('🔗 Not connected, starting connection...');
        this.connectWallet();
    }
}

// ===================================
// WALLET OPTIONS DIALOG
// ===================================
showWalletOptions() {
    const options = [
        {
            text: '📋 Copy Address',
            action: () => this.copyWalletAddress()
        },
        {
            text: '💰 View Balance',
            action: () => this.showBalanceDetails()
        },
        {
            text: '🔌 Disconnect',
            action: () => this.disconnectWallet()
        }
    ];

    this.showOptionsDialog('Wallet Options', options);
}

// ===================================
// OPTIONS DIALOG HELPER
// ===================================
showOptionsDialog(title, options) {
    const dialog = document.createElement('div');
    dialog.className = 'wallet-options-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #1a1a1a;
        border: 1px solid #00ffff;
        border-radius: 8px;
        padding: 20px;
        max-width: 300px;
        width: 100%;
        color: #ffffff;
        font-family: 'Orbitron', monospace;
    `;

    content.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 16px; color: #00ffff; text-align: center;">
            ${title}
        </div>
        <div class="option-buttons" style="display: flex; flex-direction: column; gap: 10px;">
            ${options.map((option, index) => `
                <button onclick="this.parentElement.parentElement.parentElement.handleOption(${index})" 
                        style="background: transparent; color: #00ffff; border: 1px solid #00ffff; padding: 10px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.3s ease;">
                    ${option.text}
                </button>
            `).join('')}
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    style="background: transparent; color: #999; border: 1px solid #666; padding: 10px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-top: 10px;">
                Cancel
            </button>
        </div>
    `;

    dialog.appendChild(content);
    
    // Add option handler
    dialog.handleOption = (index) => {
        options[index].action();
        dialog.remove();
    };

    document.body.appendChild(dialog);
}

// ===================================
// BALANCE DETAILS
// ===================================
showBalanceDetails() {
    if (!this.account) return;
    
    this.getBalance().then(balance => {
        alert(`💰 Wallet Balance\n\nAddress: ${this.account.address}\nBalance: ${balance} MEDAS`);
    });
}

// NEU: Wallet Options Dialog für Connected State
showWalletOptions() {
    const options = [
        {
            text: '📋 Copy Address',
            action: () => this.copyWalletAddress()
        },
        {
            text: '💰 View Balance',
            action: () => this.showBalanceDetails()
        },
        {
            text: '🔌 Disconnect',
            action: () => this.disconnectWallet()
        }
    ];

    this.showOptionsDialog('Wallet Options', options);
}

// NEU: Options Dialog Helper
showOptionsDialog(title, options) {
    const dialog = document.createElement('div');
    dialog.className = 'wallet-options-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #1a1a1a;
        border: 1px solid #00ffff;
        border-radius: 8px;
        padding: 20px;
        max-width: 300px;
        width: 100%;
        color: #ffffff;
        font-family: 'Orbitron', monospace;
    `;

    content.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 16px; color: #00ffff; text-align: center;">
            ${title}
        </div>
        <div class="option-buttons" style="display: flex; flex-direction: column; gap: 10px;">
            ${options.map((option, index) => `
                <button onclick="this.parentElement.parentElement.parentElement.handleOption(${index})" 
                        style="background: transparent; color: #00ffff; border: 1px solid #00ffff; padding: 10px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.3s ease;">
                    ${option.text}
                </button>
            `).join('')}
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    style="background: transparent; color: #999; border: 1px solid #666; padding: 10px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-top: 10px;">
                Cancel
            </button>
        </div>
    `;

    dialog.appendChild(content);
    
    // Add option handler
    dialog.handleOption = (index) => {
        options[index].action();
        dialog.remove();
    };

    document.body.appendChild(dialog);
}

// NEU: Balance Details anzeigen
showBalanceDetails() {
    if (!this.account) return;
    
    this.getBalance().then(balance => {
        alert(`💰 Wallet Balance\n\nAddress: ${this.account.address}\nBalance: ${balance} MEDAS`);
    });
}


Security Vulnerability
----------------------
        IIS module anomalies detected: False
        Security Vulnerability: Download Domains are not configured. You should configure them to be protected against C
VE-2021-1730.
                Configuration instructions: https://aka.ms/HC-DownloadDomains

Exchange IIS Information
------------------------

        Name               State    HSTS Enabled  Protocol - Bindings - Certificate
        ----               -----    ------------  ---------------------------------
        Default Web Site   Started  False         http  - *:80:          - NULL
                                                  https - :443:          - 51F481DC19DB6E95FE834EA3B179BBD4ACD210AF
                                                  http  - 127.0.0.1:80:  - NULL
                                                  https - 127.0.0.1:443: - 51F481DC19DB6E95FE834EA3B179BBD4ACD210AF
        Exchange Back End  Started  False         http  - *:81:  - NULL
                                                  https - *:444: - BA35BDBAE2CEF27F97A75360D53357D31C8419A0


        AppPoolName                          State    GCServerEnabled  RestartConditionSet
        -----------                          -----    ---------------  -------------------
        MSExchangeMapiFrontEndAppPool        Started  True             False
        MSExchangeOWAAppPool                 Started  False            False
        MSExchangeECPAppPool                 Started  False            False
        MSExchangeRestAppPool                Started  False            False
        MSExchangeMapiAddressBookAppPool     Started  False            False
        MSExchangeRpcProxyFrontEndAppPool    Started  False            False
        MSExchangePowerShellAppPool          Started  False            False
        MSExchangePowerShellFrontEndAppPool  Started  False            False
        MSExchangeRestFrontEndAppPool        Started  False            False
        MSExchangeMapiMailboxAppPool         Started  False            False
        MSExchangeOABAppPool                 Started  False            False
        MSExchangePushNotificationsAppPool   Started  False            False
        MSExchangeOWACalendarAppPool         Started  False            False
        MSExchangeAutodiscoverAppPool        Started  False            False
        MSExchangeServicesAppPool            Started  False            False
        MSExchangeSyncAppPool                Started  True             False
        MSExchangeRpcProxyAppPool            Started  False            False


        Name                 ExtendedProtection  SslFlags        IPFilteringEnabled  URLRewrite  Authentication
        ----                 ------------------  --------        ------------------  ----------  --------------
        Default Web Site     None                False           False                           anonymous (default
                                                                                                 setting)
        Default Web          Require             True (128-bit)  False                           Windows
        Site/API                                                                                 (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Default Web          None                True (128-bit)  False                           Windows
        Site/Autodiscover                                                                        (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
                                                                                                 basic
        Default Web          Require             True (128-bit)  False                           anonymous (default
        Site/ecp                                                                                 setting)
                                                                                                 basic
        Default Web          Allow               True (128-bit)  False                           Windows
        Site/EWS                                                                                 (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Default Web          Require             True (128-bit)  False                           Windows
        Site/mapi                                                                                (Negotiate,NTLM)
        Default Web          Allow               True (128-bit)  False                           basic
        Site/Microsoft-Serv
        er-ActiveSync
        Default Web          Allow               True (128-bit)  False                           Windows
        Site/Microsoft-Serv                                                                      (Negotiate,NTLM)
        er-ActiveSync/Proxy
        Default Web          Allow               True (128-bit)  False                           Windows
        Site/OAB                                                                                 (Negotiate,NTLM)
        Default Web          Require             True (128-bit)  False                           basic
        Site/owa
        Default Web          None                False           False
        Site/PowerShell                          Cert(Accept)
        Default Web          Require             True (128-bit)  False                           Windows
        Site/Rpc                                                                                 (Negotiate,NTLM)
                                                                                                 basic
        Exchange Back End    None                False           False                           anonymous (default
                                                                                                 setting)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/API                                                                                  (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Exchange Back        None                True (128-bit)  False                           Windows
        End/Autodiscover                                                                         (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/ecp                                                                                  (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/EWS                                                                                  (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Exchange Back        Require             True            False                           Windows
        End/mapi/emsmdb                                                                          (Negotiate,NTLM)
        Exchange Back        Require             True            False                           Windows
        End/mapi/nspi                                                                            (Negotiate,NTLM)
        Exchange Back        Require             True (128-bit)  False                           basic
        End/Microsoft-Serve
        r-ActiveSync
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/Microsoft-Serve                                                                      (Negotiate,NTLM)
        r-ActiveSync/Proxy
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/OAB                                                                                  (Negotiate,NTLM)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/owa                                                                                  (Negotiate,NTLM)
                                                                                                 anonymous (default
                                                                                                 setting)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/PowerShell                                                                           (Negotiate,NTLM)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/Rpc                                                                                  (Negotiate,NTLM)
        Exchange Back        Require             True (128-bit)  False                           Windows
        End/RpcWithCert                                                                          (Negotiate,NTLM)    // NEW: Shorten Wallet Address for Display
   shortenAddress(address) {
    return address || ''; // Keine Verkürzung mehr!
    }

    // NEW: Copy Wallet Address to Clipboard
    async copyWalletAddress() {
        if (!this.account || !this.account.address) {
            console.warn('⚠️ No wallet address to copy');
            this.ui.showSystemMessage('No wallet connected', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.account.address);
            
            // Visual feedback
            if (this.walletDisplayElement) {
                this.walletDisplayElement.classList.add('copy-success');
                setTimeout(() => {
                    this.walletDisplayElement.classList.remove('copy-success');
                }, 600);
            }

            console.log('📋 Wallet address copied to clipboard:', this.account.address);
            this.ui.addSystemMessage('Wallet address copied to clipboard');
            
        } catch (error) {
            console.error('❌ Failed to copy address:', error);
            this.ui.showSystemMessage('Failed to copy address', 'error');
            
            // Fallback: Show the address in a prompt
            try {
                prompt('Copy wallet address:', this.account.address);
            } catch (promptError) {
                console.error('❌ Prompt fallback failed:', promptError);
            }
        }
    }

    // Daemon Connection Management
    async checkDaemonConnection() {
        const config = API_CONFIG?.daemon || DAEMON_CONFIG;
        const urls = config.urls || config.fallbackUrls || ['http://localhost:8080'];
        
        for (const url of urls) {
            try {
                const endpoint = config.endpoints?.status || '/api/v1/status';
                const response = await fetch(`${url}${endpoint}`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                });
                
                if (response.ok) {
                    this.daemonUrl = url;
                    this.daemonConnected = true;
                    this.ui.updateSystemStatus('Daemon Protocol', true);
                    this.ui.addSystemMessage(`Chat daemon connected at ${url}`);
                    this.connectWebSocket();
                    this.loadContacts();
                    this.loadMessageHistory();
                    return;
                }
            } catch (error) {
                // Try next URL
                console.warn(`Daemon connection failed for ${url}:`, error);
            }
        }
        
        this.daemonConnected = false;
        this.ui.updateSystemStatus('Daemon Protocol', false);
        this.ui.addSystemMessage('Chat daemon offline - Install medas-digital-daemon');
        this.showDaemonSetupInstructions();
    }

    showDaemonSetupInstructions() {
        setTimeout(() => {
            this.ui.addMessageToUI({
                type: 'system',
                content: `🐳 DAEMON SETUP INSTRUCTIONS:

Start the Medas Digital daemon for full chat functionality:

docker run -d --name medas-digital-daemon \\
  -p 8080:8080 \\
  -v ~/.medas-digital:/data \\
  medas-digital/daemon:latest

Then refresh this page to connect.

Current mode: Blockchain-only (no chat)`,
                timestamp: new Date(),
                sender: 'SYSTEM'
            });
        }, 2000);
    }

    // WebSocket Connection for Real-time Messages
    connectWebSocket() {
        if (!this.daemonUrl) return;

        const config = API_CONFIG?.websocket || DAEMON_CONFIG?.websocket;
        const wsPath = config?.url || '/ws/messages';
        const wsUrl = this.daemonUrl.replace('http', 'ws') + wsPath;
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                this.ui.addSystemMessage('Real-time messaging connected');
            };
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleIncomingMessage(message);
            };
            
            this.websocket.onclose = () => {
                this.ui.addSystemMessage('Real-time connection lost - attempting reconnect...');
                setTimeout(() => this.connectWebSocket(), 5000);
            };
            
            this.websocket.onerror = (error) => {
                console.warn('WebSocket error:', error);
            };
        } catch (error) {
            console.warn('WebSocket connection failed:', error);
        }
    }

    handleIncomingMessage(message) {
        // Add message to appropriate conversation
        if (!this.messageHistory.has(message.from)) {
            this.messageHistory.set(message.from, []);
        }
        
        this.messageHistory.get(message.from).push({
            ...message,
            type: 'received'
        });

        // Update UI if chat tab is active
        if (this.activeTab === 'comm') {
            this.ui.addMessageToUI({
                from: message.from,
                content: message.content,
                timestamp: new Date(message.timestamp),
                type: 'received',
                sender: this.getContactName(message.from)
            });
        }

        // Add notification
        this.ui.showNotification(`New message from ${this.getContactName(message.from)}`);
    }

    getContactName(address) {
        const contact = this.contacts.get(address);
        return contact ? contact.displayName : address.substring(0, 12) + '...';
    }

    checkKeplrAvailability() {
        if (window.keplr) {
            this.keplr = window.keplr;
            this.ui.showSystemMessage('Keplr quantum interface detected', 'success');
        } else {
            this.ui.showSystemMessage('Keplr interface not found - Install Keplr extension', 'error');
            this.ui.updateConnectButton('Install Keplr Protocol', () => {
                window.open('https://www.keplr.app/download', '_blank');
            });
        }
    }

    // Contact Management
    async loadContacts() {
        if (!this.daemonConnected) return;

        try {
            const config = API_CONFIG?.daemon || DAEMON_CONFIG;
            const endpoint = config.endpoints?.contacts || '/api/v1/contacts';
            const response = await fetch(`${this.daemonUrl}${endpoint}`);
            
            if (response.ok) {
                const contacts = await response.json();
                contacts.forEach(contact => {
                    this.contacts.set(contact.address, contact);
                });
            }
        } catch (error) {
            console.warn('Failed to load contacts:', error);
            // Use mock data as fallback
            if (window.MockData) {
                window.MockData.contacts.forEach(contact => {
                    this.contacts.set(contact.address, contact);
                });
            }
        }
    }

    async loadMessageHistory() {
        if (!this.daemonConnected) return;

        try {
            const config = API_CONFIG?.daemon || DAEMON_CONFIG;
            const endpoint = config.endpoints?.messages || '/api/v1/messages';
            const response = await fetch(`${this.daemonUrl}${endpoint}/history?limit=50`);
            
            if (response.ok) {
                const messages = await response.json();
                
                // Group messages by conversation
                messages.forEach(message => {
                    const contactAddress = message.from === this.account?.address ? message.to : message.from;
                    
                    if (!this.messageHistory.has(contactAddress)) {
                        this.messageHistory.set(contactAddress, []);
                    }
                    
                    this.messageHistory.get(contactAddress).push(message);
                });
                
                // Update UI with recent messages
                this.updateChatDisplay();
            }
        } catch (error) {
            console.warn('Failed to load message history:', error);
            // Use mock data as fallback
            if (window.MockData) {
                this.loadMockMessages();
            }
        }
    }

    loadMockMessages() {
        window.MockData.messages.forEach(message => {
            const contactAddress = message.from === this.account?.address ? message.to : message.from;
            
            if (!this.messageHistory.has(contactAddress)) {
                this.messageHistory.set(contactAddress, []);
            }
            
            this.messageHistory.get(contactAddress).push(message);
        });
        
        this.updateChatDisplay();
    }

    updateChatDisplay() {
        if (this.messageHistory.size === 0) return;

        const messagesContainer = document.getElementById('message-display');
        messagesContainer.innerHTML = '';

        // Show messages from all conversations
        const allMessages = [];
        this.messageHistory.forEach((messages, contact) => {
            allMessages.push(...messages);
        });

        // Sort by timestamp
        allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Display recent messages
        allMessages.slice(-20).forEach(message => {
            this.ui.addMessageToUI({
                from: message.from,
                content: message.content,
                timestamp: new Date(message.timestamp),
                type: message.from === this.account?.address ? 'sent' : 'received',
                sender: message.from === this.account?.address ? 'YOU' : this.getContactName(message.from)
            });
        });
    }

    // Blockchain Monitoring
    startBlockchainMonitoring() {
        // Check blockchain status immediately
        this.checkBlockchainStatus();
        
        // Then check every 10 seconds
        setInterval(() => {
            this.checkBlockchainStatus();
        }, 10000);
        
        // Check block height every 30 seconds when online
        setInterval(() => {
            if (this.blockchainOnline) {
                this.updateBlockHeight();
            }
        }, 30000);
    }

    async checkBlockchainStatus() {
        try {
            const startTime = Date.now();
            const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
            const response = await fetch(`${rpcUrl}/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            const endTime = Date.now();
            this.networkLatency = endTime - startTime;
            
            if (response.ok) {
                const data = await response.json();
                this.blockchainOnline = true;
                this.currentBlock = parseInt(data.result.sync_info.latest_block_height);
                
                this.ui.updateBlockchainUI(true, this.currentBlock);
                this.ui.updateNetworkLatency(this.networkLatency, true);
                
                if (!this.blockchainStatusLogged) {
                    this.ui.addSystemMessage('Blockchain network detected - Medas Digital chain active');
                    this.blockchainStatusLogged = true;
                }
            } else {
                throw new Error('RPC not responding');
            }
        } catch (error) {
            this.blockchainOnline = false;
            this.ui.updateBlockchainUI(false);
            this.ui.updateNetworkLatency(0, false);
            
            if (this.blockchainStatusLogged) {
                this.ui.addSystemMessage('Blockchain network connection lost');
                this.blockchainStatusLogged = false;
            }
        }
    }

    async updateBlockHeight() {
        if (!this.blockchainOnline) return;
        
        try {
            const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
            const response = await fetch(`${rpcUrl}/status`);
            
            if (response.ok) {
                const data = await response.json();
                const newBlock = parseInt(data.result.sync_info.latest_block_height);
                
                if (newBlock > this.currentBlock) {
                    this.currentBlock = newBlock;
                    this.ui.updateBlockchainUI(true, this.currentBlock);
                    
                    // Occasionally show block updates
                    if (Math.random() < 0.1) { // 10% chance
                        this.ui.addSystemMessage(`New block mined: #${this.currentBlock}`);
                    }
                }
            }
        } catch (error) {
            console.error('Block height update failed:', error);
        }
    }

    // Wallet Connection
    async connectWallet() {
        try {
            // NEW: Set connecting state
            this.setWalletConnecting(true);
            
            // Use improved Keplr Detection
            const connected = await this.keplrManager.connect();
            if (!connected) {
                this.ui.showSystemMessage('Keplr not found - Install extension', 'error');
                // NEW: Reset to disconnected state
                this.updateWalletHeader();
                return;
            }

            // Chain suggestion
            try {
                await window.keplr.experimentalSuggestChain(MEDAS_CHAIN_CONFIG);
                console.log('✅ Chain suggestion successful');
            } catch (error) {
                console.log('Chain already exists or user rejected:', error);
            }

            // Enable chain
            const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
            await window.keplr.enable(chainId);
            
            // Get accounts
            const offlineSigner = window.getOfflineSigner(chainId);
            const accounts = await offlineSigner.getAccounts();
            
            if (accounts.length > 0) {
                this.account = {
                    address: accounts[0].address
                };
                this.connected = true;
                
                // NEW: Update wallet header
                this.updateWalletHeader();
                
                // Update UI
                this.ui.addSystemMessage(`Wallet connected: ${this.account.address}`);
                this.ui.updateConnectionStatus(true);
                
                // Get balance
                const balance = await this.getBalance();
                if (balance !== 'ERROR') {
                    this.ui.updateUIAfterConnection(this.account, balance);
                }
                
                // Enable message input
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.placeholder = "Enter transmission data...";
                }
                
                // Account change listener
                window.addEventListener('keplr_keystorechange', () => {
                    console.log('Keplr account changed, reconnecting...');
                    this.connectWallet();
                });
                
                console.log('✅ Wallet connected:', this.account.address);
            }
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            this.ui.showSystemMessage('Connection failed - Check Keplr', 'error');
            // NEW: Reset to disconnected state
            this.connected = false;
            this.account = null;
            this.updateWalletHeader();
        }
    }

    async getBalance() {
        try {
            const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://api.medas-digital.io:1317';
            const response = await fetch(`${restUrl}/cosmos/bank/v1beta1/balances/${this.account.address}`);
            const data = await response.json();
            
            const medasBalance = data.balances.find(b => b.denom === 'umedas');
            if (medasBalance) {
                const balance = (parseInt(medasBalance.amount) / 1000000).toFixed(6);
                this.ui.addSystemMessage(`Account balance verified: ${balance} MEDAS`);
                return balance;
            }
            return '0.000000';
        } catch (error) {
            console.error('Balance query failed:', error);
            this.ui.addSystemMessage('Balance query failed - Using cached data');
            return 'ERROR';
        }
    }

    // Message Handling
    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;

        if (!this.daemonConnected) {
            this.ui.showSystemMessage('Chat daemon required for messaging', 'error');
            return;
        }

        try {
            // Add message to UI immediately
            this.ui.addMessageToUI({
                from: this.account?.address,
                content: message,
                timestamp: new Date(),
                type: 'sent',
                sender: 'YOU'
            });

            input.value = '';

            // Send to daemon
            const config = API_CONFIG?.daemon || DAEMON_CONFIG;
            const endpoint = config.endpoints?.messages || '/api/v1/messages';
            const response = await fetch(`${this.daemonUrl}${endpoint}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: 'broadcast', // Could be enhanced for specific recipients
                    content: message,
                    from: this.account?.address,
                    type: 'text'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const result = await response.json();
            this.ui.addSystemMessage(`Message sent via ${result.relay || 'daemon'}`);

        } catch (error) {
            console.error('Message send failed:', error);
            this.ui.showSystemMessage('Message send failed - check daemon connection', 'error');
            
            // Remove the message from UI on failure
            const messages = document.querySelectorAll('.message-sent');
            if (messages.length > 0) {
                messages[messages.length - 1].style.opacity = '0.5';
                messages[messages.length - 1].title = 'Failed to send';
            }
        }
    }

    // Wallet Disconnection
    disconnectWallet() {
        this.account = null;
        this.connected = false;
        
        // NEW: Update wallet header
        this.updateWalletHeader();
        
        this.ui.updateConnectionStatus(false);
        this.ui.resetWalletInterface();
        this.ui.addSystemMessage('Quantum authentication terminated');
    }

    handleAccountChange() {
        if (this.connected) {
            this.ui.showSystemMessage('Quantum signature changed - Reconnection required', 'error');
            this.disconnectWallet();
        }
    }

    // Staking Functions
    delegateTokens() {
        const validator = document.getElementById('validator-select')?.value;
        const amount = document.getElementById('stake-amount')?.value;
        
        if (!validator || validator === 'Select a validator...') {
            this.ui.showSystemMessage('Please select a validator', 'error');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            this.ui.showSystemMessage('Please enter a valid amount', 'error');
            return;
        }
        
        this.ui.addSystemMessage(`Delegating ${amount} MEDAS to ${validator}`);
        // TODO: Implement actual delegation logic here
        this.ui.showSystemMessage('Delegation feature will be implemented with transaction signing', 'info');
    }

    // Token Transfer Functions
    sendTokens() {
        const address = document.getElementById('send-address')?.value;
        const amount = document.getElementById('send-amount')?.value;
        const memo = document.getElementById('send-memo')?.value;
        
        if (!address) {
            this.ui.showSystemMessage('Please enter recipient address', 'error');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            this.ui.showSystemMessage('Please enter a valid amount', 'error');
            return;
        }
        
        this.ui.addSystemMessage(`Sending ${amount} MEDAS to ${address.substring(0, 20)}...`);
        // TODO: Implement actual send logic here
        this.ui.showSystemMessage('Send feature will be implemented with transaction signing', 'info');
    }

    // Transaction Signing (Future Implementation)
    async signAndBroadcastTransaction(messages, fee, memo = '') {
        if (!this.connected || !this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
            const offlineSigner = window.getOfflineSigner(chainId);
            
            // Get account info
            const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://api.medas-digital.io:1317';
            const accountResponse = await fetch(
                `${restUrl}/cosmos/auth/v1beta1/accounts/${this.account.address}`
            );
            
            if (!accountResponse.ok) {
                throw new Error('Failed to get account info');
            }

            const accountData = await accountResponse.json();
            const accountNumber = accountData.account.account_number;
            const sequence = accountData.account.sequence;

            // Create transaction document
            const txDoc = {
                chain_id: chainId,
                account_number: accountNumber.toString(),
                sequence: sequence.toString(),
                fee: fee,
                msgs: messages,
                memo: memo
            };

            // Sign with Keplr
            const signature = await window.keplr.signAmino(
                chainId,
                this.account.address,
                txDoc
            );

            // Broadcast transaction
            const txBytes = this.encodeTxForBroadcast(signature, txDoc);
            
            const broadcastResponse = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tx_bytes: txBytes,
                    mode: 'BROADCAST_MODE_SYNC'
                })
            });

            if (!broadcastResponse.ok) {
                throw new Error('Broadcast failed');
            }

            const result = await broadcastResponse.json();
            
            if (result.tx_response.code !== 0) {
                throw new Error(`Transaction failed: ${result.tx_response.raw_log}`);
            }

            return {
                code: result.tx_response.code,
                transactionHash: result.tx_response.txhash,
                rawLog: result.tx_response.raw_log
            };

        } catch (error) {
            console.error('❌ Transaction signing failed:', error);
            throw error;
        }
    }

    encodeTxForBroadcast(signature, txDoc) {
        // Simplified encoding - real implementation would use protobuf
        // This is a placeholder that would need proper implementation
        const encoded = btoa(JSON.stringify({
            signature: signature,
            transaction: txDoc
        }));
        
        return encoded;
    }

    // Utility Methods
    switchTab(tabName) {
        this.ui.switchTab(tabName);
        this.activeTab = tabName;
    }

    addSystemMessage(message) {
        this.ui.addSystemMessage(message);
    }

    showSystemMessage(message, type) {
        this.ui.showSystemMessage(message, type);
    }

    // Getters for external access
    get isConnected() {
        return this.connected;
    }

    get walletAddress() {
        return this.account?.address;
    }

    get isBlockchainOnline() {
        return this.blockchainOnline;
    }

    get isDaemonConnected() {
        return this.daemonConnected;
    }

    get currentBlockHeight() {
        return this.currentBlock;
    }
}

// Initialize the research terminal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make terminal globally accessible
    window.terminal = new MedasResearchTerminal();
    
    // Add to global scope for debugging
    if (DEBUG_CONFIG?.logging?.enabled) {
        console.log('🌌 MedasDigital Research Terminal v0.9 initialized');
        console.log('Terminal instance available as window.terminal');
        
        // Log environment info
        if (window.Environment) {
            console.log('🌍 Environment:', window.Environment.getDeviceInfo());
        }
        
        // Log feature flags
        if (window.FEATURE_FLAGS) {
            console.log('🏁 Active Features:', Object.entries(window.FEATURE_FLAGS)
                .filter(([key, value]) => value === true)
                .map(([key]) => key));
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedasResearchTerminal;
} else {
    window.MedasResearchTerminal = MedasResearchTerminal;
}
