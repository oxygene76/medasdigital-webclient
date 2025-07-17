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
        
        // Wallet Header Elements - Control Panel
        this.walletDisplayElement = null;
        this.walletStatusElement = null;
        this.walletAddressElement = null;
        this.addressTextElement = null;
        this.copyButtonElement = null;
        
        // Wallet Header Elements - Desktop Header
        this.headerWalletDisplayElement = null;
        this.headerWalletStatusElement = null;
        this.headerWalletAddressElement = null;
        this.headerAddressTextElement = null;
        this.headerCopyButtonElement = null;
        
        // Wallet Header Elements - Mobile
        this.mobileWalletDisplayElement = null;
        this.mobileWalletStatusElement = null;
        this.mobileWalletAddressElement = null;
        this.mobileAddressTextElement = null;
        this.mobileCopyButtonElement = null;
        
        // Initialize UI Manager
        this.ui = new UIManager();
        
        this.initializeTerminal();
        this.initializeEventListeners();
        this.initializeWalletHeader();
        this.checkKeplrAvailability();
        this.checkDaemonConnection();
        this.startBlockchainMonitoring();
    }

    initializeTerminal() {
        console.log('🚀 MedasDigital Research Terminal v0.9 initializing...');
    }

    initializeEventListeners() {
        window.delegateTokens = () => this.delegateTokens();
        window.setMaxStakeAmount = () => this.ui.setMaxStakeAmount();
        window.setMaxSendAmount = () => this.ui.setMaxSendAmount();
        window.sendTokens = () => this.sendTokens();
    }

  // ERSETZE nur die initializeWalletHeader() Funktion in main.js:

initializeWalletHeader() {
    try {
        // ===================================
        // CONTROL PANEL ELEMENTS (im Control Panel Sidebar)
        // ===================================
        this.walletDisplayElement = document.getElementById('wallet-display');
        this.walletStatusElement = document.getElementById('wallet-status');
        this.walletAddressElement = document.getElementById('wallet-address');
        this.addressTextElement = document.getElementById('address-text');
        this.copyButtonElement = document.getElementById('copy-address');

        // ===================================
        // DESKTOP HEADER ELEMENTS (der neue Connect Button im Header)
        // ===================================
        this.headerWalletDisplayElement = document.querySelector('.header-wallet-display');
        this.headerWalletStatusElement = this.headerWalletDisplayElement?.querySelector('.wallet-status');
        this.headerWalletAddressElement = this.headerWalletDisplayElement?.querySelector('.wallet-address');
        this.headerAddressTextElement = this.headerWalletDisplayElement?.querySelector('.address-text');
        this.headerCopyButtonElement = this.headerWalletDisplayElement?.querySelector('.copy-btn');

        // ===================================
        // MOBILE WALLET ELEMENTS (Mobile Version im Header)
        // ===================================
        this.mobileWalletDisplayElement = document.querySelector('.wallet-section .wallet-display');
        this.mobileWalletStatusElement = this.mobileWalletDisplayElement?.querySelector('.wallet-status');
        this.mobileWalletAddressElement = this.mobileWalletDisplayElement?.querySelector('.wallet-address');
        this.mobileAddressTextElement = this.mobileWalletDisplayElement?.querySelector('.address-text');
        this.mobileCopyButtonElement = this.mobileWalletDisplayElement?.querySelector('.copy-btn');

        // ===================================
        // DEBUG LOGGING
        // ===================================
        console.log('🔍 DEBUG - Wallet Elements Found:');
        console.log('  Control Panel (Sidebar):', !!this.walletDisplayElement);
        console.log('  Desktop Header (NEU):', !!this.headerWalletDisplayElement);
        console.log('  Mobile Header:', !!this.mobileWalletDisplayElement);

        // WARNUNG: Falls Control Panel Elemente fehlen (weil wir sie entfernt haben)
        if (!this.walletDisplayElement) {
            console.warn('⚠️ Control Panel wallet elements not found - this is expected if you removed the duplicate wallet box');
        }

        // ===================================
        // EVENT LISTENERS - CONTROL PANEL (falls vorhanden)
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
        // EVENT LISTENERS - DESKTOP HEADER (WICHTIG!)
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
            console.error('❌ Desktop Header Button (.header-wallet-display) not found in DOM! Check HTML structure.');
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
        // EVENT LISTENERS - MOBILE WALLET
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
            console.warn('⚠️ Mobile Wallet Button not found - this is normal on desktop');
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
        this.updateWalletHeader();
        
    } catch (error) {
        console.error('❌ Wallet header initialization failed:', error);
    }
}
 updateWalletHeader() {
    // ===================================
    // CONTROL PANEL DISPLAY (optional - falls vorhanden)
    // ===================================
    if (this.walletDisplayElement) {
        try {
            if (this.connected && this.account) {
                this.walletDisplayElement.className = 'wallet-display connected';
                
                if (this.walletStatusElement) {
                    this.walletStatusElement.innerHTML = `
                        <span class="status-icon">💳</span>
                        <span class="status-text">Connected</span>
                    `;
                }

                if (this.walletAddressElement && this.addressTextElement) {
                    const fullAddress = this.account.address;
                    this.walletAddressElement.style.display = 'flex';
                    this.walletAddressElement.style.visibility = 'visible';
                    this.addressTextElement.textContent = fullAddress;
                    this.addressTextElement.title = fullAddress;
                }
            } else {
                this.walletDisplayElement.className = 'wallet-display disconnected';
                
                if (this.walletStatusElement) {
                    this.walletStatusElement.innerHTML = `
                        <span class="status-icon">💳</span>
                        <span class="status-text">No Wallet</span>
                    `;
                }

                if (this.walletAddressElement) {
                    this.walletAddressElement.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('❌ Control Panel update failed:', error);
        }
    }

    // ===================================
    // DESKTOP HEADER DISPLAY (HAUPTFUNKTION)
    // ===================================
    if (this.headerWalletDisplayElement) {
        try {
            if (this.connected && this.account) {
                this.headerWalletDisplayElement.className = 'header-wallet-display connected';
                
                if (this.headerWalletStatusElement) {
                    this.headerWalletStatusElement.innerHTML = `
                        <span class="status-icon">💳</span>
                        CONNECTED
                    `;
                }

                if (this.headerWalletAddressElement && this.headerAddressTextElement) {
                    const fullAddress = this.account.address;
                    // VOLLSTÄNDIGE ADRESSE für Desktop Header (bessere Lesbarkeit)
                    
                    this.headerWalletAddressElement.style.display = 'flex';
                    this.headerWalletAddressElement.style.visibility = 'visible';
                    this.headerAddressTextElement.textContent = fullAddress; // VOLLSTÄNDIGE ADRESSE
                    this.headerAddressTextElement.title = fullAddress;
                }

                if (this.headerCopyButtonElement) {
                    this.headerCopyButtonElement.style.display = 'inline-block';
                }

                console.log('🔄 Desktop Header updated: Connected with full address');
            } else {
                this.headerWalletDisplayElement.className = 'header-wallet-display disconnected';
                
                if (this.headerWalletStatusElement) {
                    this.headerWalletStatusElement.innerHTML = `
                        <span class="status-icon">⚡</span>
                        NOT CONNECTED
                    `;
                }

                if (this.headerWalletAddressElement && this.headerAddressTextElement) {
                    this.headerWalletAddressElement.style.display = 'flex';
                    this.headerWalletAddressElement.style.visibility = 'visible';
                    this.headerAddressTextElement.textContent = 'CLICK TO CONNECT KEPLR WALLET';
                    this.headerAddressTextElement.title = '';
                }

                if (this.headerCopyButtonElement) {
                    this.headerCopyButtonElement.style.display = 'none';
                }

                console.log('🔄 Desktop Header updated: Disconnected');
            }
        } catch (error) {
            console.error('❌ Desktop Header update failed:', error);
        }
    } else {
        console.error('❌ Desktop Header element not found! Check if .header-wallet-display exists in HTML.');
    }

    // ===================================
    // MOBILE WALLET DISPLAY (falls vorhanden)
    // ===================================
    if (this.mobileWalletDisplayElement) {
        try {
            if (this.connected && this.account) {
                this.mobileWalletDisplayElement.className = 'wallet-display connected';
                
                if (this.mobileWalletStatusElement) {
                    this.mobileWalletStatusElement.innerHTML = `
                        <span class="status-icon">💳</span>
                        Connected
                    `;
                }

                if (this.mobileWalletAddressElement && this.mobileAddressTextElement) {
                    const fullAddress = this.account.address;
                    const shortenedAddress = fullAddress.length > 14 ? 
                        fullAddress.substring(0, 8) + '...' + fullAddress.substring(fullAddress.length - 6) : 
                        fullAddress;
                    
                    this.mobileWalletAddressElement.style.display = 'flex';
                    this.mobileWalletAddressElement.style.visibility = 'visible';
                    this.mobileAddressTextElement.textContent = shortenedAddress;
                    this.mobileAddressTextElement.title = fullAddress;
                }

                if (this.mobileCopyButtonElement) {
                    this.mobileCopyButtonElement.style.display = 'inline-block';
                }
            } else {
                this.mobileWalletDisplayElement.className = 'wallet-display disconnected';
                
                if (this.mobileWalletStatusElement) {
                    this.mobileWalletStatusElement.innerHTML = `
                        <span class="status-icon">⚡</span>
                        NOT CONNECTED
                    `;
                }

                if (this.mobileWalletAddressElement && this.mobileAddressTextElement) {
                    this.mobileWalletAddressElement.style.display = 'flex';
                    this.mobileWalletAddressElement.style.visibility = 'visible';
                    this.mobileAddressTextElement.textContent = 'CLICK TO CONNECT KEPLR WALLET';
                    this.mobileAddressTextElement.title = '';
                }

                if (this.mobileCopyButtonElement) {
                    this.mobileCopyButtonElement.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('❌ Mobile Wallet update failed:', error);
        }
    }
}
    // ===================================
    // SET CONNECTING STATE - ALL ELEMENTS
    // ===================================
    setWalletConnecting(isConnecting = true) {
        if (isConnecting) {
            // Control Panel
            if (this.walletDisplayElement) {
                this.walletDisplayElement.className = 'wallet-display connecting';
                if (this.walletStatusElement) {
                    this.walletStatusElement.innerHTML = `
                        <span class="status-icon">💳</span>
                        <span class="status-text">Connecting...</span>
                    `;
                }
            }

            // Desktop Header
            if (this.headerWalletDisplayElement) {
                this.headerWalletDisplayElement.className = 'header-wallet-display connecting';
                if (this.headerWalletStatusElement) {
                    this.headerWalletStatusElement.innerHTML = `
                        <span class="status-icon">⚡</span>
                        CONNECTING...
                    `;
                }
                if (this.headerAddressTextElement) {
                    this.headerAddressTextElement.textContent = 'CONNECTING TO KEPLR WALLET...';
                }
            }

            // Mobile
            if (this.mobileWalletDisplayElement) {
                this.mobileWalletDisplayElement.className = 'wallet-display connecting';
                if (this.mobileWalletStatusElement) {
                    this.mobileWalletStatusElement.innerHTML = `
                        <span class="status-icon">⚡</span>
                        Connecting...
                    `;
                }
                if (this.mobileAddressTextElement) {
                    this.mobileAddressTextElement.textContent = 'CONNECTING TO KEPLR WALLET...';
                }
            }
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
        
        dialog.handleOption = (index) => {
            options[index].action();
            dialog.remove();
        };

        document.body.appendChild(dialog);
    }

    showBalanceDetails() {
        if (!this.account) return;
        
        this.getBalance().then(balance => {
            alert(`💰 Wallet Balance\n\nAddress: ${this.account.address}\nBalance: ${balance} MEDAS`);
        });
    }

    // ===================================
    // COPY WALLET ADDRESS
    // ===================================
    async copyWalletAddress() {
        if (!this.account || !this.account.address) {
            console.warn('⚠️ No wallet address to copy');
            this.ui.showSystemMessage('No wallet connected', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.account.address);
            
            // Visual feedback for all elements
            [this.walletDisplayElement, this.headerWalletDisplayElement, this.mobileWalletDisplayElement]
                .filter(el => el)
                .forEach(el => {
                    el.classList.add('copy-success');
                    setTimeout(() => el.classList.remove('copy-success'), 600);
                });

            console.log('📋 Wallet address copied to clipboard:', this.account.address);
            this.ui.addSystemMessage('Wallet address copied to clipboard');
            
        } catch (error) {
            console.error('❌ Failed to copy address:', error);
            this.ui.showSystemMessage('Failed to copy address', 'error');
            
            try {
                prompt('Copy wallet address:', this.account.address);
            } catch (promptError) {
                console.error('❌ Prompt fallback failed:', promptError);
            }
        }
    }

    // ===================================
    // REMAINING METHODS (unchanged)
    // ===================================
    
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
        if (!this.messageHistory.has(message.from)) {
            this.messageHistory.set(message.from, []);
        }
        
        this.messageHistory.get(message.from).push({
            ...message,
            type: 'received'
        });

        if (this.activeTab === 'comm') {
            this.ui.addMessageToUI({
                from: message.from,
                content: message.content,
                timestamp: new Date(message.timestamp),
                type: 'received',
                sender: this.getContactName(message.from)
            });
        }

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
                
                messages.forEach(message => {
                    const contactAddress = message.from === this.account?.address ? message.to : message.from;
                    
                    if (!this.messageHistory.has(contactAddress)) {
                        this.messageHistory.set(contactAddress, []);
                    }
                    
                    this.messageHistory.get(contactAddress).push(message);
                });
                
                this.updateChatDisplay();
            }
        } catch (error) {
            console.warn('Failed to load message history:', error);
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

        const allMessages = [];
        this.messageHistory.forEach((messages, contact) => {
            allMessages.push(...messages);
        });

        allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

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

    startBlockchainMonitoring() {
        this.checkBlockchainStatus();
        
        setInterval(() => {
            this.checkBlockchainStatus();
        }, 10000);
        
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
                    
                    if (Math.random() < 0.1) {
                        this.ui.addSystemMessage(`New block mined: #${this.currentBlock}`);
                    }
                }
            }
        } catch (error) {
            console.error('Block height update failed:', error);
        }
    }

    async connectWallet() {
        try {
            this.setWalletConnecting(true);
            
            const connected = await this.keplrManager.connect();
            if (!connected) {
                this.ui.showSystemMessage('Keplr not found - Install extension', 'error');
                this.updateWalletHeader();
                return;
            }

            try {
                await window.keplr.experimentalSuggestChain(MEDAS_CHAIN_CONFIG);
                console.log('✅ Chain suggestion successful');
            } catch (error) {
                console.log('Chain already exists or user rejected:', error);
            }

            const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
            await window.keplr.enable(chainId);
            
            const offlineSigner = window.getOfflineSigner(chainId);
            const accounts = await offlineSigner.getAccounts();
            
            if (accounts.length > 0) {
                this.account = {
                    address: accounts[0].address
                };
                this.connected = true;
                
                this.updateWalletHeader();
                
                this.ui.addSystemMessage(`Wallet connected: ${this.account.address}`);
                this.ui.updateConnectionStatus(true);
                
                const balance = await this.getBalance();
                if (balance !== 'ERROR') {
                    this.ui.updateUIAfterConnection(this.account, balance);
                }
                
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.placeholder = "Enter transmission data...";
                }
                
                window.addEventListener('keplr_keystorechange', () => {
                    console.log('Keplr account changed, reconnecting...');
                    this.connectWallet();
                });
                
                console.log('✅ Wallet connected:', this.account.address);
            }
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            this.ui.showSystemMessage('Connection failed - Check Keplr', 'error');
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

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;

        if (!this.daemonConnected) {
            this.ui.showSystemMessage('Chat daemon required for messaging', 'error');
            return;
        }

        try {
            this.ui.addMessageToUI({
                from: this.account?.address,
                content: message,
                timestamp: new Date(),
                type: 'sent',
                sender: 'YOU'
            });

            input.value = '';

            const config = API_CONFIG?.daemon || DAEMON_CONFIG;
            const endpoint = config.endpoints?.messages || '/api/v1/messages';
            const response = await fetch(`${this.daemonUrl}${endpoint}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: 'broadcast',
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
            
            const messages = document.querySelectorAll('.message-sent');
            if (messages.length > 0) {
                messages[messages.length - 1].style.opacity = '0.5';
                messages[messages.length - 1].title = 'Failed to send';
            }
        }
    }

    disconnectWallet() {
        this.account = null;
        this.connected = false;
        
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
        this.ui.showSystemMessage('Delegation feature will be implemented with transaction signing', 'info');
    }

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
        this.ui.showSystemMessage('Send feature will be implemented with transaction signing', 'info');
    }

    async signAndBroadcastTransaction(messages, fee, memo = '') {
        if (!this.connected || !this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
            const offlineSigner = window.getOfflineSigner(chainId);
            
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

            const txDoc = {
                chain_id: chainId,
                account_number: accountNumber.toString(),
                sequence: sequence.toString(),
                fee: fee,
                msgs: messages,
                memo: memo
            };

            const signature = await window.keplr.signAmino(
                chainId,
                this.account.address,
                txDoc
            );

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
        const encoded = btoa(JSON.stringify({
            signature: signature,
            transaction: txDoc
        }));
        
        return encoded;
    }

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
    window.terminal = new MedasResearchTerminal();
    
    if (DEBUG_CONFIG?.logging?.enabled) {
        console.log('🌌 MedasDigital Research Terminal v0.9 initialized');
        console.log('Terminal instance available as window.terminal');
        
        if (window.Environment) {
            console.log('🌍 Environment:', window.Environment.getDeviceInfo());
        }
        
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
