// ===================================
// STAKING-MANAGER.JS - FUNKTIONIEREND
// Basiert auf dem funktionierenden Code aus index.html
// Wartet auf JSPM CosmJS Loading
// ===================================

class StakingManager {
    constructor() {
        this.chainId = 'medasdigital-2';  // Ihre Chain ID
        this.rpcUrl = 'https://rpc.medas-digital.io:26657';
        this.restUrl = 'https://lcd.medas-digital.io:1317';
        this.denom = 'umedas';
        this.client = null;
        this.account = null;
        
        // Warte auf CosmJS aus index.html JSMP Loading
        this.waitForCosmJS();
        console.log('✅ StakingManager initialized (WeedWallet-Pattern)');
    }
    
    async waitForCosmJS() {
        let attempts = 0;
        while (!window.cosmjsReady && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.cosmjsReady) {
            console.log('✅ StakingManager: CosmJS ready!');
        } else {
            console.warn('⚠️ StakingManager: CosmJS timeout');
        }
    }
    
    // WeedWallet-Pattern: Direkte Keplr-Verbindung
    async connectKeplr() {
        if (!window.keplr) {
            throw new Error('Keplr extension not found');
        }
        
        // Chain vorschlagen
        await this.suggestChain();
        
        // Keplr aktivieren
        await window.keplr.enable(this.chainId);
        
        // Signer erstellen
        const offlineSigner = window.getOfflineSigner(this.chainId);
        
        // Client erstellen (WeedWallet-Pattern) - VERWENDET GLOBALES COSMJS
        this.client = await window.SigningStargateClient.connectWithSigner(
            this.rpcUrl,
            offlineSigner,
            { gasPrice: window.GasPrice.fromString("0.025umedas") }
        );
        
        // Account
        const accounts = await offlineSigner.getAccounts();
        this.account = accounts[0];
        
        console.log('✅ Keplr connected (WeedWallet-Pattern):', this.account.address);
        return this.account;
    }
    
    async suggestChain() {
        const chainConfig = {
            chainId: this.chainId,
            chainName: 'MedasDigital',
            rpc: this.rpcUrl,
            rest: this.restUrl,
            bip44: { coinType: 118 },
            bech32Config: {
                bech32PrefixAccAddr: 'medas',
                bech32PrefixAccPub: 'medaspub',
                bech32PrefixValAddr: 'medasvaloper',
                bech32PrefixValPub: 'medasvaloperpub',
                bech32PrefixConsAddr: 'medasvalcons',
                bech32PrefixConsPub: 'medasvalconspub'
            },
            currencies: [{
                coinDenom: 'MEDAS',
                coinMinimalDenom: 'umedas',
                coinDecimals: 6
            }],
            feeCurrencies: [{
                coinDenom: 'MEDAS',
                coinMinimalDenom: 'umedas',
                coinDecimals: 6,
                gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 }
            }],
            stakeCurrency: {
                coinDenom: 'MEDAS',
                coinMinimalDenom: 'umedas',
                coinDecimals: 6
            }
        };
        
        try {
            await window.keplr.experimentalSuggestChain(chainConfig);
            console.log('✅ Chain suggested to Keplr');
        } catch (error) {
            console.log('ℹ️ Chain suggestion failed (might already exist)');
        }
    }
    
    // WeedWallet-Pattern: Direkte Delegation
    async delegate(delegatorAddress, validatorAddress, amount) {
        try {
            console.log('🔄 Starting delegation (WeedWallet-Pattern)...');
            
            if (!this.client) {
                await this.connectKeplr();
            }
            
            const amountInUmedas = parseFloat(amount) * 1000000;
            const coin = { denom: this.denom, amount: amountInUmedas.toString() };
            
            const msg = {
                typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                value: { delegatorAddress, validatorAddress, amount: coin }
            };
            
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                [msg],
                "auto",
                "Delegation via MedasDigital WebClient"
            );
            
            console.log('✅ Delegation successful:', result);
            return { success: true, txHash: result.transactionHash };
            
        } catch (error) {
            console.error('❌ Delegation failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async undelegate(delegatorAddress, validatorAddress, amount) {
        try {
            if (!this.client) await this.connectKeplr();
            
            const amountInUmedas = parseFloat(amount) * 1000000;
            const coin = { denom: this.denom, amount: amountInUmedas.toString() };
            
            const msg = {
                typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
                value: { delegatorAddress, validatorAddress, amount: coin }
            };
            
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                [msg],
                "auto",
                "Undelegation via MedasDigital WebClient"
            );
            
            return { success: true, txHash: result.transactionHash };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            if (!this.client) await this.connectKeplr();
            
            const messages = validatorAddresses.map(validatorAddress => ({
                typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
                value: { delegatorAddress, validatorAddress }
            }));
            
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                messages,
                "auto",
                "Claim rewards via MedasDigital WebClient"
            );
            
            return { success: true, txHash: result.transactionHash };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // ===================================
    // SEND TOKENS FUNKTION (FEHLTE!)
    // ===================================
    
    async sendTokens(fromAddress, toAddress, amount, memo = "") {
        try {
            console.log('🔄 WeedWallet-Pattern: Sending tokens...');
            
            if (!this.client) {
                await this.connectKeplr();
            }

            const amountInUmedas = parseFloat(amount) * 1000000;
            const coin = { denom: this.denom, amount: amountInUmedas.toString() };

            const msg = {
                typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                value: {
                    fromAddress,
                    toAddress,
                    amount: [coin]
                }
            };

            const result = await this.client.signAndBroadcast(
                fromAddress,
                [msg],
                "auto",
                memo || "Token transfer via MedasDigital WebClient"
            );

            console.log('✅ WeedWallet-Pattern: Tokens sent:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height
            };
            
        } catch (error) {
            console.error('❌ WeedWallet-Pattern: Send failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// ===================================
// WARTEN AUF COSMJS DANN INITIALISIEREN
// ===================================

function initializeStakingManager() {
    // Nur initialisieren wenn CosmJS bereit ist
    if (window.cosmjsReady && window.SigningStargateClient) {
        window.stakingManager = new StakingManager();
        
        // Global helper functions (exakt wie in index.html)
        window.delegateTokens = async function(validatorAddress, amount) {
            // Wenn keine Parameter, versuche aus UI zu lesen
            if (!validatorAddress) {
                validatorAddress = document.getElementById('validator-select')?.value;
            }
            if (!amount) {
                amount = document.getElementById('stake-amount')?.value;
            }
            
            if (!window.terminal?.account?.address) {
                alert('Please connect your wallet first');
                return;
            }
            
            if (!validatorAddress || validatorAddress === 'Select a validator...') {
                alert('Please select a validator');
                return;
            }
            
            if (!amount || parseFloat(amount) <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            try {
                console.log('🔄 Delegating via global function...');
                
                const result = await window.stakingManager.delegate(
                    window.terminal.account.address,
                    validatorAddress,
                    amount
                );
                
                if (result.success) {
                    alert(`✅ Successfully delegated ${amount} MEDAS!\nTx Hash: ${result.txHash}`);
                    
                    // UI refresh wenn verfügbar
                    if (window.uiManager?.populateUserDelegations) {
                        window.uiManager.populateUserDelegations(window.terminal.account.address);
                    }
                } else {
                    alert(`❌ Delegation failed: ${result.error}`);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Global delegation failed:', error);
                alert(`❌ Delegation error: ${error.message}`);
            }
        };
        
        // Helper für Advanced Operations
        window.performRedelegationFromForm = async function() {
            const fromValidator = document.getElementById('redelegate-from-select')?.value;
            const toValidator = document.getElementById('redelegate-to-select')?.value;
            const amount = document.getElementById('redelegate-amount')?.value;
            
            if (!window.terminal?.account?.address) {
                alert('Please connect your wallet first');
                return;
            }
            
            if (!fromValidator || !toValidator || !amount) {
                alert('Please fill in all redelegation fields');
                return;
            }
            
            // Implementierung für Redelegation...
            alert('Redelegation feature coming soon!');
        };
        
        window.performUndelegationFromForm = async function() {
            const validator = document.getElementById('undelegate-from-select')?.value;
            const amount = document.getElementById('undelegate-amount')?.value;
            
            if (!window.terminal?.account?.address) {
                alert('Please connect your wallet first');
                return;
            }
            
            if (!validator || !amount) {
                alert('Please fill in all undelegation fields');
                return;
            }
            
            try {
                const result = await window.stakingManager.undelegate(
                    window.terminal.account.address,
                    validator,
                    amount
                );
                
                if (result.success) {
                    alert(`✅ Successfully undelegated ${amount} MEDAS!\nUnbonding period: 21 days\nTx Hash: ${result.txHash}`);
                } else {
                    alert(`❌ Undelegation failed: ${result.error}`);
                }
            } catch (error) {
                alert(`❌ Undelegation error: ${error.message}`);
            }
        };
        
        // ===================================
        // SEND TOKENS GLOBAL FUNKTION (FEHLTE!)
        // ===================================
        
        window.sendTokens = async function() {
            const toAddress = document.getElementById('send-address')?.value;
            const amount = document.getElementById('send-amount')?.value;
            const memo = document.getElementById('send-memo')?.value || '';
            
            if (!window.terminal?.account?.address) {
                alert('Please connect your wallet first');
                return;
            }
            
            if (!toAddress || !amount) {
                alert('Please fill in recipient address and amount');
                return;
            }
            
            // Validate address format
            if (!toAddress.startsWith('medas1') || toAddress.length < 39) {
                alert('Please enter a valid MEDAS address (starts with medas1)');
                return;
            }
            
            if (parseFloat(amount) <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            try {
                console.log('🔄 Sending tokens via global function...');
                
                const result = await window.stakingManager.sendTokens(
                    window.terminal.account.address,
                    toAddress,
                    amount,
                    memo
                );
                
                if (result.success) {
                    alert(`✅ Successfully sent ${amount} MEDAS!\nTo: ${toAddress}\nTx Hash: ${result.txHash}`);
                    
                    // Clear form
                    document.getElementById('send-address').value = '';
                    document.getElementById('send-amount').value = '';
                    document.getElementById('send-memo').value = '';
                    
                    // UI refresh wenn verfügbar
                    if (window.uiManager?.fetchUserBalances) {
                        window.uiManager.fetchUserBalances(window.terminal.account.address);
                    }
                } else {
                    alert(`❌ Send failed: ${result.error}`);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Global send failed:', error);
                alert(`❌ Send error: ${error.message}`);
            }
        };
        
        // Helper für MAX Button im Send-Formular
        window.setMaxSendAmount = async function() {
            const sendInput = document.getElementById('send-amount');
            if (!sendInput) return;
            
            try {
                if (window.terminal?.connected && window.terminal?.account?.address) {
                    // Versuche echte Balance zu holen
                    if (window.uiManager?.fetchUserBalances) {
                        const balances = await window.uiManager.fetchUserBalances(window.terminal.account.address);
                        if (balances && balances.available) {
                            // Lasse etwas für Gas-Fees übrig
                            const maxAmount = Math.max(0, parseFloat(balances.available) - 0.01);
                            sendInput.value = maxAmount.toFixed(6);
                            console.log(`📊 Set max send amount: ${maxAmount.toFixed(6)} MEDAS`);
                            return;
                        }
                    }
                }
                
                // Fallback
                console.warn('⚠️ Using fallback max send amount');
                sendInput.value = '0.000000';
            } catch (error) {
                console.error('❌ Failed to get max send amount:', error);
                sendInput.value = '0.000000';
            }
        };
        
        console.log('✅ Simplified StakingManager loaded (WeedWallet-Pattern)!');
        return true;
    }
    return false;
}

// ===================================
// EVENT-BASED INITIALIZATION
// ===================================

// Versuche sofortige Initialisierung
if (!initializeStakingManager()) {
    // Warte auf cosmjs-loaded Event aus index.html
    window.addEventListener('cosmjs-loaded', initializeStakingManager);
    
    // Fallback: Polling alle 200ms
    let attempts = 0;
    const pollInterval = setInterval(() => {
        attempts++;
        if (initializeStakingManager() || attempts > 50) {
            clearInterval(pollInterval);
            if (attempts > 50) {
                console.error('❌ StakingManager: Timeout waiting for CosmJS');
            }
        }
    }, 200);
}

console.log('✅ StakingManager module loaded - waiting for CosmJS...');
