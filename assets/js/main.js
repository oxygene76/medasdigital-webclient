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
        
        // Initialize UI Manager
        this.ui = new UIManager();
        
        this.initializeTerminal();
        this.initializeEventListeners();
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
            // Use improved Keplr Detection
            const connected = await this.keplrManager.connect();
            if (!connected) {
                this.ui.showSystemMessage('Keplr not found - Install extension', 'error');
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
