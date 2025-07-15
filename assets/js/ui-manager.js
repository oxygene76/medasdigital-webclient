// MedasDigital WebClient - UI Manager

class UIManager {
    constructor() {
        this.activeTab = 'comm';
        this.messageHistory = new Map();
        this.contacts = new Map();
        this.init();
    }

    init() {
        this.createStarfield();
        this.updateTimestamp();
        this.startTimestampUpdates();
        this.setupEventListeners();
        this.initializeTabSystem();
        this.showBootMessages();
    }

    // Starfield Animation
    createStarfield() {
        const starsContainer = document.getElementById('stars');
        const numStars = 150;
        
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }
    }

    // Timestamp Management
    updateTimestamp() {
        const now = new Date();
        const timeString = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        document.getElementById('current-time').textContent = timeString;
    }

    startTimestampUpdates() {
        setInterval(() => this.updateTimestamp(), 1000);
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Wallet connection
        document.getElementById('connect-wallet')?.addEventListener('click', () => {
            if (window.terminal) {
                window.terminal.connectWallet();
            }
        });

        // Message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (window.terminal) {
                        window.terminal.sendMessage();
                    }
                }
            });
        }

        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.filterTransactions(e.target.dataset.filter);
            }
        });

        // Keplr account change listener
        if (window.keplr) {
            window.addEventListener('keplr_keystorechange', () => {
                if (window.terminal) {
                    window.terminal.handleAccountChange();
                }
            });
        }
    }

    // Tab System Management
    initializeTabSystem() {
        this.switchTab('comm'); // Default tab
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const tabContent = document.getElementById(`${tabName}-tab`);
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');
        
        this.activeTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch(tabName) {
            case 'explorer':
                this.updateExplorerData();
                break;
            case 'staking':
                this.updateStakingData();
                break;
            case 'wallet':
                this.updateWalletData();
                break;
        }
    }

    // Message UI Management
    addMessageToUI(message) {
        const messagesContainer = document.getElementById('message-display');
        
        if (messagesContainer.querySelector('.empty-state')) {
            messagesContainer.innerHTML = '';
        }

        const messageElement = document.createElement('div');
        let messageClass = 'message-item ';
        
        switch (message.type) {
            case 'sent':
                messageClass += 'message-sent';
                break;
            case 'system':
                messageClass += 'message-system';
                break;
            default:
                messageClass += 'message-received';
        }
        
        messageElement.className = messageClass;

        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        const sender = message.sender || (message.type === 'sent' ? 'YOU' : 
                       message.from?.substring(0, 12) + '...' || 'UNKNOWN');

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addSystemMessage(message) {
        this.addMessageToUI({
            type: 'system',
            content: message,
            timestamp: new Date(),
            sender: 'SYSTEM'
        });
    }

    // Connection Status Updates
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (connected) {
            statusElement.className = 'connection-status status-connected';
            statusElement.innerHTML = `
                <div class="status-dot dot-connected"></div>
                <span>Network Active</span>
            `;
        } else {
            statusElement.className = 'connection-status status-disconnected';
            statusElement.innerHTML = `
                <div class="status-dot dot-disconnected"></div>
                <span>Network Offline</span>
            `;
        }
    }

    updateBlockchainUI(online, currentBlock = 0) {
        const blockchainStatus = document.getElementById('blockchain-status');
        const blockchainIndicator = document.getElementById('blockchain-indicator');
        const blockchainStatusText = document.getElementById('blockchain-status-text');
        const blockHeightStatusElement = document.getElementById('block-height-status');
        
        if (online) {
            // HAUPTFIX: blockchain-status Element direkt updaten
            if (blockchainStatus) {
                blockchainStatus.className = 'connection-status status-connected';
                blockchainStatus.innerHTML = `
                    <div class="status-dot dot-connected"></div>
                    <span>Block: #${currentBlock.toLocaleString()}</span>
                `;
                console.log('✅ Updated blockchain-status with block:', currentBlock);
            } else {
                console.error('❌ blockchain-status element not found!');
            }
            
            // System Status Panel Updates (falls vorhanden)
            if (blockchainIndicator) {
                blockchainIndicator.className = 'indicator-dot';
            }
            if (blockchainStatusText) {
                blockchainStatusText.textContent = 'SYNCED';
                blockchainStatusText.style.color = '#00ff00';
            }
            if (blockHeightStatusElement) {
                blockHeightStatusElement.textContent = `#${currentBlock.toLocaleString()}`;
                blockHeightStatusElement.style.color = '#00ff00';
            }
        } else {
            // Offline state
            if (blockchainStatus) {
                blockchainStatus.className = 'connection-status status-disconnected';
                blockchainStatus.innerHTML = `
                    <div class="status-dot dot-disconnected"></div>
                    <span>Block: ---</span>
                `;
                console.log('✅ Updated blockchain-status to offline');
            }
            
            if (blockchainIndicator) {
                blockchainIndicator.className = 'indicator-dot indicator-offline';
            }
            if (blockchainStatusText) {
                blockchainStatusText.textContent = 'OFFLINE';
                blockchainStatusText.style.color = '#ff3030';
            }
            if (blockHeightStatusElement) {
                blockHeightStatusElement.textContent = '---';
                blockHeightStatusElement.style.color = '#ff3030';
            }
        }
    }

   updateNetworkLatency(latency, online) {
        // FIX: Nur System Status updaten (kein separates Header Element)
        const latencyStatusElement = document.getElementById('network-latency-status');
        
        if (latencyStatusElement) {
            if (online && latency > 0) {
                latencyStatusElement.textContent = `${latency} ms`;
                
                // Color code latency
                if (latency < 500) {
                    latencyStatusElement.style.color = '#00ff00'; // Green for good
                } else if (latency < 1000) {
                    latencyStatusElement.style.color = '#ffaa00'; // Orange for okay
                } else {
                    latencyStatusElement.style.color = '#ff3030'; // Red for bad
                }
            } else {
                latencyStatusElement.textContent = '--- ms';
                latencyStatusElement.style.color = '#ff3030';
            }
        }
    }

    updateSystemStatus(systemName, online) {
        const systems = document.querySelectorAll('.system-item');
        systems.forEach(system => {
            const name = system.querySelector('.system-name').textContent;
            if (name === systemName) {
                const indicator = system.querySelector('.indicator-dot');
                const status = system.querySelector('.system-indicator span');
                if (online) {
                    indicator.className = 'indicator-dot';
                    status.textContent = 'ACTIVE';
                    status.style.color = '#00ff00';
                } else {
                    indicator.className = 'indicator-dot indicator-offline';
                    status.textContent = 'OFFLINE';
                    status.style.color = '#ff3030';
                }
            }
        });
    }

    // Wallet UI Management
    updateUIAfterConnection(account, balance) {
        const walletInterface = document.getElementById('wallet-interface');
        walletInterface.innerHTML = `
            <div class="wallet-display">
                <div class="data-field">
                    <div class="field-label">Quantum Address</div>
                    <div class="field-value">${account.address}</div>
                </div>
                <div class="data-field">
                    <div class="field-label">MEDAS Balance</div>
                    <div class="field-value balance-display">${balance} MEDAS</div>
                </div>
            </div>
            <button id="disconnect-wallet" class="terminal-button btn-danger">
                Disconnect Protocol
            </button>
        `;

        document.getElementById('disconnect-wallet').addEventListener('click', () => {
            if (window.terminal) {
                window.terminal.disconnectWallet();
            }
        });

        this.updateSystemStatus('Quantum Relay', true);
    }

    updateConnectButton(text, onClick = null, loading = false) {
        const button = document.getElementById('connect-wallet');
        if (button) {
            button.innerHTML = loading ? 
                `<div class="loading-spinner"></div> ${text}` : text;
            button.disabled = loading;
            
            if (onClick) {
                button.onclick = onClick;
            } else {
                button.onclick = () => {
                    if (window.terminal) {
                        window.terminal.connectWallet();
                    }
                };
            }
        }
    }

    resetWalletInterface() {
        const walletInterface = document.getElementById('wallet-interface');
        walletInterface.innerHTML = `
            <p style="color: #999999; margin-bottom: 16px; font-family: 'Share Tech Mono', monospace; font-size: 12px;">
                Initialize Keplr quantum authentication protocol
            </p>
            <button id="connect-wallet" class="terminal-button btn-primary">
                Connect Keplr Wallet
            </button>
        `;

        document.getElementById('connect-wallet').addEventListener('click', () => {
            if (window.terminal) {
                window.terminal.connectWallet();
            }
        });

        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.disabled = true;
        }

        document.getElementById('message-display').innerHTML = `
            <div class="empty-state">
                <h3>System Standby</h3>
                <div class="icon">◉</div>
                <p>Awaiting quantum wallet authentication...</p>
                <p style="font-size: 11px; margin-top: 8px;">Initialize Keplr interface to establish secure communication channel</p>
            </div>
        `;

        this.updateSystemStatus('Quantum Relay', false);
    }

    // System Messages & Notifications
    showSystemMessage(message, type = 'info') {
        const existingMessages = document.querySelectorAll('.error-display, .success-display');
        existingMessages.forEach(msg => msg.remove());

        const messageElement = document.createElement('div');
        messageElement.className = type === 'error' ? 'error-display' : 'success-display';
        messageElement.textContent = message;

        const walletInterface = document.getElementById('wallet-interface');
        walletInterface.appendChild(messageElement);

        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 5000);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 255, 255, 0.9);
            color: #000;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Boot Messages
    showBootMessages() {
        setTimeout(() => {
            this.addSystemMessage('Research Terminal v0.9 initialized');
        }, 1000);
        setTimeout(() => {
            this.addSystemMessage('Quantum encryption protocols loaded');
        }, 2000);
        setTimeout(() => {
            this.addSystemMessage('Scanning blockchain network...');
        }, 3000);
        setTimeout(() => {
            this.addSystemMessage('Awaiting researcher authentication...');
        }, 4500);
    }

    // Explorer Tab Data
    updateExplorerData() {
        this.populateRecentBlocks();
        this.updateNetworkStats();
        
        if (window.terminal?.connected) {
            const walletSection = document.getElementById('wallet-history-section');
            if (walletSection) {
                walletSection.style.display = 'block';
                this.populateWalletTransactions();
            }
        }
    }

    populateRecentBlocks() {
        const blocksContainer = document.getElementById('recent-blocks-list');
        if (!blocksContainer) return;

        const currentBlock = window.terminal?.currentBlock || 2847392;
        const blocks = [];
        
        for (let i = 0; i < 10; i++) {
            blocks.push({
                height: currentBlock - i,
                time: new Date(Date.now() - (i * 6000)).toLocaleTimeString(),
                txs: Math.floor(Math.random() * 20) + 1
            });
        }
        
        blocksContainer.innerHTML = blocks.map(block => `
            <div class="block-item">
                <span class="block-height">#${block.height.toLocaleString()}</span>
                <span class="block-txs">${block.txs} TXs</span>
                <span class="block-time">${block.time}</span>
            </div>
        `).join('');
    }

    updateNetworkStats() {
        const currentBlock = window.terminal?.currentBlock || 2847392;
        const latestBlockEl = document.getElementById('latest-block');
        if (latestBlockEl) {
            latestBlockEl.textContent = currentBlock.toLocaleString();
        }
        
        // Simulated data - replace with real API calls
        const validatorCountEl = document.getElementById('validator-count');
        if (validatorCountEl) validatorCountEl.textContent = '147';
        
        const bondedRatioEl = document.getElementById('bonded-ratio');
        if (bondedRatioEl) bondedRatioEl.textContent = '68.4%';
        
        const blockTimeEl = document.getElementById('block-time');
        if (blockTimeEl) blockTimeEl.textContent = '6.2s';
    }

    populateWalletTransactions() {
        const walletContainer = document.getElementById('wallet-transactions');
        if (!walletContainer || !window.MockData) return;

        const mockTransactions = window.MockData.transactions.slice(0, 5);
        
        walletContainer.innerHTML = mockTransactions.map(tx => `
            <div class="tx-item tx-${tx.type}">
                <span class="tx-type">${tx.type.toUpperCase()}</span>
                <span class="tx-amount">${tx.amount} MEDAS</span>
                <span class="tx-time">${tx.time}</span>
            </div>
        `).join('');
    }

    // Staking Tab Data
    updateStakingData() {
        this.populateValidators();
        
        if (window.terminal?.connected) {
            const delegationsSection = document.getElementById('my-delegations-section');
            if (delegationsSection) {
                delegationsSection.style.display = 'block';
                this.populateUserDelegations();
                this.updateValidatorSelect();
            }
        }
    }

    populateValidators() {
        const validatorsContainer = document.getElementById('validators-list');
        if (!validatorsContainer || !window.MockData) return;
        
        validatorsContainer.innerHTML = window.MockData.validators.map(validator => `
            <div class="delegation-item">
                <div class="validator-info">
                    <div class="validator-name">${validator.name}</div>
                    <div class="validator-details">
                        Commission: ${validator.commission} | APY: ${validator.apy} | Power: ${validator.voting_power}
                    </div>
                </div>
                <div class="stake-actions">
                    <button class="btn-small btn-primary" style="border-color: #00ffff; color: #00ffff;">
                        Select
                    </button>
                </div>
            </div>
        `).join('');
    }

    populateUserDelegations() {
        const delegations = [
            { validator: 'Observatory Node Alpha', amount: '1,250.000000', rewards: '12.450000' },
            { validator: 'Quantum Research Pool', amount: '800.000000', rewards: '8.120000' }
        ];

        const delegationsContainer = document.getElementById('current-delegations');
        if (!delegationsContainer) return;

        delegationsContainer.innerHTML = delegations.map(delegation => `
            <div class="delegation-item">
                <div class="validator-info">
                    <div class="validator-name">${delegation.validator}</div>
                    <div class="validator-details">Delegated: ${delegation.amount} MEDAS</div>
                </div>
                <div class="delegation-amount">
                    <div style="color: #00ff00;">+${delegation.rewards} MEDAS</div>
                    <div style="font-size: 10px; color: #999;">Pending Rewards</div>
                </div>
                <div class="stake-actions">
                    <button class="btn-small" style="border-color: #ff00ff; color: #ff00ff;">
                        Claim
                    </button>
                    <button class="btn-small" style="border-color: #ffaa00; color: #ffaa00;">
                        Undelegate
                    </button>
                </div>
            </div>
        `).join('');

        // Update total rewards
        const totalRewards = delegations.reduce((sum, d) => sum + parseFloat(d.rewards), 0);
        const totalRewardsEl = document.getElementById('total-rewards');
        if (totalRewardsEl) {
            totalRewardsEl.textContent = `${totalRewards.toFixed(6)} MEDAS`;
        }
    }

    updateValidatorSelect() {
        const select = document.getElementById('validator-select');
        if (!select || !window.MockData) return;

        select.innerHTML = '<option>Select a validator...</option>' +
            window.MockData.validators.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
    }

    // Wallet Tab Data
    updateWalletData() {
        if (window.terminal?.connected) {
            const balanceSection = document.getElementById('balance-section');
            if (balanceSection) balanceSection.style.display = 'block';
            
            const historySection = document.getElementById('transaction-history-section');
            if (historySection) historySection.style.display = 'block';
            
            this.updateBalanceOverview();
            this.populateTransactionHistory();
        }
    }

    updateBalanceOverview() {
        const balances = {
            available: '1,245.670000',
            delegated: '2,050.000000',
            rewards: '20.570000',
            total: '3,316.240000'
        };

        const availableEl = document.getElementById('available-balance');
        if (availableEl) availableEl.textContent = balances.available;
        
        const delegatedEl = document.getElementById('delegated-balance');
        if (delegatedEl) delegatedEl.textContent = balances.delegated;
        
        const rewardsEl = document.getElementById('rewards-balance');
        if (rewardsEl) rewardsEl.textContent = balances.rewards;
        
        const totalEl = document.getElementById('total-balance');
        if (totalEl) totalEl.textContent = balances.total;
    }

    populateTransactionHistory() {
        const transactionsContainer = document.getElementById('transaction-list');
        if (!transactionsContainer || !window.MockData) return;
        
        transactionsContainer.innerHTML = window.MockData.transactions.map(tx => `
            <div class="tx-item tx-${tx.type}">
                <span class="tx-type">${tx.type.toUpperCase()}</span>
                <span class="tx-amount">${tx.amount} MEDAS</span>
                <span class="tx-time">${tx.time}</span>
            </div>
        `).join('');
    }

    filterTransactions(filterType) {
        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-filter="${filterType}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Filter transactions (implement filtering logic)
        this.populateTransactionHistory(); // For now, just refresh
    }

    // Global Action Handlers
    setMaxStakeAmount() {
        const stakeInput = document.getElementById('stake-amount');
        if (stakeInput) {
            stakeInput.value = '1245.670000';
        }
    }

    setMaxSendAmount() {
        const sendInput = document.getElementById('send-amount');
        if (sendInput) {
            sendInput.value = '1245.670000';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
    console.log('🎨 UIManager loaded');
}
