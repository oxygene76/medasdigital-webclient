// MedasDigital WebClient - Keplr Wallet Manager

class KeplrManager {
    constructor() {
        this.keplr = null;
        this.maxRetries = WALLET_CONFIG?.keplr?.detection?.maxRetries || 50;
        this.retryDelay = WALLET_CONFIG?.keplr?.detection?.retryDelay || 100;
        this.timeout = WALLET_CONFIG?.keplr?.detection?.timeout || 5000;
        this.chainId = MEDAS_CHAIN_CONFIG.chainId;
        this.isDetecting = false;
        this.isConnected = false;
        this.account = null;
        
        // Mobile detection
        this.isMobile = Environment?.isMobile() || window.innerWidth <= 768;
        this.isKeplrMobile = Environment?.isKeplrMobile() || /Keplr/i.test(navigator.userAgent);
        
        this.init();
    }

    init() {
        if (DEBUG_CONFIG?.logging?.enabled && DEBUG_CONFIG?.logging?.categories?.wallet) {
            console.log('🦊 Initializing KeplrManager', {
                mobile: this.isMobile,
                keplrMobile: this.isKeplrMobile,
                chainId: this.chainId
            });
        }

        // Listen for Keplr installation
        if (!this.isMobile) {
            this.setupDesktopListeners();
        }
        
        // Listen for account changes
        this.setupAccountChangeListeners();
    }

    setupDesktopListeners() {
        // Listen for window.keplr availability
        window.addEventListener('keplr_keystorechange', () => {
            console.log('🔄 Keplr keystore changed');
            this.handleAccountChange();
        });

        // Check periodically for Keplr installation
        this.checkKeplrInstallation();
    }

    setupAccountChangeListeners() {
        if (WALLET_CONFIG?.keplr?.connection?.accountChangeListening) {
            window.addEventListener('keplr_keystorechange', () => {
                this.handleAccountChange();
            });
        }
    }

    checkKeplrInstallation() {
        const checkInterval = setInterval(() => {
            if (window.keplr && !this.keplr) {
                console.log('✅ Keplr extension detected');
                this.keplr = window.keplr;
                clearInterval(checkInterval);
            }
        }, 1000);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    async detectKeplr() {
        if (this.isDetecting) {
            console.warn('🔍 Keplr detection already in progress');
            return false;
        }

        this.isDetecting = true;

        try {
            console.log('🔍 Detecting Keplr wallet...');

            // Mobile-specific detection
            if (this.isMobile) {
                return await this.detectMobileKeplr();
            }

            // Desktop detection
            return await this.detectDesktopKeplr();
        } finally {
            this.isDetecting = false;
        }
    }

    async detectDesktopKeplr() {
        const startTime = Date.now();

        for (let i = 0; i < this.maxRetries; i++) {
            // Check if timeout reached
            if (Date.now() - startTime > this.timeout) {
                console.error('⏰ Keplr detection timeout');
                break;
            }

            if (window.keplr && window.getOfflineSigner) {
                this.keplr = window.keplr;
                console.log(`✅ Keplr detected successfully after ${i * this.retryDelay}ms`);
                
                // Test responsiveness
                if (await this.testKeplrResponsiveness()) {
                    return true;
                }
            }

            if (i % 10 === 0 && i > 0) {
                console.log(`⏳ Waiting for Keplr... (${i}/${this.maxRetries})`);
            }

            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }

        console.error(`❌ Keplr not detected after ${this.maxRetries * this.retryDelay}ms`);
        this.showKeplrInstallPrompt();
        return false;
    }

    async detectMobileKeplr() {
        console.log('📱 Detecting mobile Keplr...');

        // Check if we're in Keplr mobile browser
        if (this.isKeplrMobile && window.keplr) {
            this.keplr = window.keplr;
            console.log('✅ Keplr mobile browser detected');
            return true;
        }

        // Check for Keplr extension in mobile browser
        if (window.keplr && window.getOfflineSigner) {
            this.keplr = window.keplr;
            console.log('✅ Keplr mobile extension detected');
            
            if (await this.testKeplrResponsiveness()) {
                return true;
            }
        }

        // Show mobile connection options
        console.log('📱 Showing mobile Keplr options');
        this.showMobileKeplrDialog();
        return false;
    }

    async testKeplrResponsiveness() {
        try {
            // Test with a known chain (Cosmos Hub)
            await this.keplr.getKey("cosmoshub-4");
            console.log('✅ Keplr is responsive');
            return true;
        } catch (error) {
            console.warn('⚠️ Keplr detected but not responsive:', error);
            return false;
        }
    }

    async connect() {
        const detected = await this.detectKeplr();
        if (!detected) {
            return false;
        }

        try {
            // Suggest chain if needed
            if (WALLET_CONFIG?.keplr?.connection?.chainSuggestion) {
                await this.suggestChain();
            }

            // Enable chain
            await this.keplr.enable(this.chainId);
            
            // Get account
            const account = await this.getAccount();
            if (account) {
                this.account = account;
                this.isConnected = true;
                console.log('✅ Keplr connected:', account.address);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Keplr connection failed:', error);
            return false;
        }
    }

    async suggestChain() {
        try {
            await this.keplr.experimentalSuggestChain(MEDAS_CHAIN_CONFIG);
            console.log('✅ Chain suggestion successful');
        } catch (error) {
            if (error.message?.includes('already exists')) {
                console.log('ℹ️ Chain already exists in Keplr');
            } else {
                console.warn('⚠️ Chain suggestion failed or rejected:', error);
                throw error;
            }
        }
    }

    async getAccount() {
        try {
            const offlineSigner = window.getOfflineSigner(this.chainId);
            const accounts = await offlineSigner.getAccounts();
            
            if (accounts.length === 0) {
                throw new Error('No accounts available');
            }

            return {
                address: accounts[0].address,
                pubkey: accounts[0].pubkey,
                algo: accounts[0].algo
            };
        } catch (error) {
            console.error('❌ Failed to get account:', error);
            return null;
        }
    }

    async getBalance(address) {
        try {
            const response = await fetch(
                `${MEDAS_CHAIN_CONFIG.rest}/cosmos/bank/v1beta1/balances/${address}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const medasBalance = data.balances?.find(b => b.denom === 'umedas');
            
            if (medasBalance) {
                const balance = (parseInt(medasBalance.amount) / 1000000).toFixed(6);
                return balance;
            }
            
            return '0.000000';
        } catch (error) {
            console.error('❌ Balance query failed:', error);
            return 'ERROR';
        }
    }

    async signTransaction(messages, fee, memo = '') {
        if (!this.isConnected || !this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const offlineSigner = window.getOfflineSigner(this.chainId);
            
            // Get account info
            const accountResponse = await fetch(
                `${MEDAS_CHAIN_CONFIG.rest}/cosmos/auth/v1beta1/accounts/${this.account.address}`
            );
            
            if (!accountResponse.ok) {
                throw new Error('Failed to get account info');
            }

            const accountData = await accountResponse.json();
            const accountNumber = accountData.account.account_number;
            const sequence = accountData.account.sequence;

            // Create transaction document
            const txDoc = {
                chain_id: this.chainId,
                account_number: accountNumber.toString(),
                sequence: sequence.toString(),
                fee: fee,
                msgs: messages,
                memo: memo
            };

            // Sign with Keplr
            const signature = await this.keplr.signAmino(
                this.chainId,
                this.account.address,
                txDoc
            );

            return signature;
        } catch (error) {
            console.error('❌ Transaction signing failed:', error);
            throw error;
        }
    }

    async broadcastTransaction(signature, txDoc) {
        try {
            // Encode transaction for broadcast
            const txBytes = this.encodeTxForBroadcast(signature, txDoc);
            
            const broadcastResponse = await fetch(
                `${MEDAS_CHAIN_CONFIG.rest}/cosmos/tx/v1beta1/txs`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tx_bytes: txBytes,
                        mode: 'BROADCAST_MODE_SYNC'
                    })
                }
            );

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
            console.error('❌ Transaction broadcast failed:', error);
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

    disconnect() {
        this.isConnected = false;
        this.account = null;
        console.log('🔌 Wallet disconnected');
    }

    async handleAccountChange() {
        if (!this.isConnected) return;

        console.log('🔄 Account change detected, reconnecting...');
        
        try {
            const newAccount = await this.getAccount();
            if (newAccount && newAccount.address !== this.account?.address) {
                this.account = newAccount;
                console.log('✅ Account updated:', newAccount.address);
                
                // Emit account change event
                window.dispatchEvent(new CustomEvent('walletAccountChanged', {
                    detail: { account: newAccount }
                }));
            }
        } catch (error) {
            console.error('❌ Account change handling failed:', error);
            this.disconnect();
        }
    }

    showKeplrInstallPrompt() {
        const installUrl = 'https://www.keplr.app/';
        const message = `🦊 Keplr Wallet Extension Required!

To use MedasDigital WebClient, please:

1. Install Keplr extension from: ${installUrl}
2. Restart your browser
3. Refresh this page
4. Click "Connect Wallet"

Install Keplr now?`;

        if (confirm(message)) {
            window.open(installUrl, '_blank');
        }
    }

    showMobileKeplrDialog() {
        const isIOS = Environment?.isIOS() || /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = Environment?.isAndroid() || /Android/.test(navigator.userAgent);
        
        let message = '📱 Keplr Mobile Wallet Required!\n\n';
        let actions = [];

        if (isIOS) {
            message += 'For iOS devices:\n';
            actions.push({
                text: '📱 Open in Keplr iOS App',
                action: () => this.openKeplrMobileApp('ios')
            });
            actions.push({
                text: '🏪 Download from App Store',
                action: () => window.open(WALLET_CONFIG.mobile.keplrApp.ios.appStore, '_blank')
            });
        } else if (isAndroid) {
            message += 'For Android devices:\n';
            actions.push({
                text: '📱 Open in Keplr Android App',
                action: () => this.openKeplrMobileApp('android')
            });
            actions.push({
                text: '🏪 Download from Google Play',
                action: () => window.open(WALLET_CONFIG.mobile.keplrApp.android.playStore, '_blank')
            });
        } else {
            message += 'For mobile devices:\n';
            actions.push({
                text: '📱 Open in Keplr App',
                action: () => this.openKeplrMobileApp('generic')
            });
        }

        actions.push({
            text: '📋 Copy URL for Keplr App',
            action: () => this.copyUrlForKeplrApp()
        });

        // Show custom dialog
        this.showMobileDialog(message, actions);
    }

    openKeplrMobileApp(platform) {
        const currentUrl = window.location.href;
        
        switch (platform) {
            case 'ios':
                window.location.href = `${WALLET_CONFIG.mobile.keplrApp.ios.scheme}?url=${encodeURIComponent(currentUrl)}`;
                break;
            case 'android':
                window.location.href = WALLET_CONFIG.mobile.keplrApp.android.intent.replace('#Intent', `?url=${encodeURIComponent(currentUrl)}#Intent`);
                break;
            default:
                // Try iOS first, then Android
                setTimeout(() => {
                    window.location.href = WALLET_CONFIG.mobile.keplrApp.android.intent.replace('#Intent', `?url=${encodeURIComponent(currentUrl)}#Intent`);
                }, 1000);
                window.location.href = `${WALLET_CONFIG.mobile.keplrApp.ios.scheme}?url=${encodeURIComponent(currentUrl)}`;
        }
    }

    copyUrlForKeplrApp() {
        const url = window.location.href;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                alert('📋 URL copied! Open Keplr app and paste the URL in the browser.');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('📋 URL copied! Open Keplr app and paste the URL in the browser.');
        }
    }

    showMobileDialog(message, actions) {
        // Create mobile-friendly dialog
        const dialog = document.createElement('div');
        dialog.className = 'mobile-keplr-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
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
            border-radius: 12px;
            padding: 20px;
            max-width: 400px;
            width: 100%;
            color: #ffffff;
            font-family: 'Orbitron', monospace;
        `;

        content.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.4;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            <div class="action-buttons" style="display: flex; flex-direction: column; gap: 12px;">
                ${actions.map((action, index) => `
                    <button onclick="this.parentElement.parentElement.parentElement.handleAction(${index})" 
                            style="background: #00ffff; color: #000; border: none; padding: 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        ${action.text}
                    </button>
                `).join('')}
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: transparent; color: #999; border: 1px solid #666; padding: 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;

        dialog.appendChild(content);
        
        // Add action handler
        dialog.handleAction = (index) => {
            actions[index].action();
            dialog.remove();
        };

        document.body.appendChild(dialog);
    }

    // Utility methods
    isConnected() {
        return this.isConnected && this.account !== null;
    }

    getConnectedAccount() {
        return this.account;
    }

    getChainId() {
        return this.chainId;
    }

    // Event emitters
    onAccountChange(callback) {
        window.addEventListener('walletAccountChanged', callback);
    }

    onConnect(callback) {
        window.addEventListener('walletConnected', callback);
    }

    onDisconnect(callback) {
        window.addEventListener('walletDisconnected', callback);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeplrManager;
} else {
    window.KeplrManager = KeplrManager;
    console.log('🦊 KeplrManager loaded');
}
