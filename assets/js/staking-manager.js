// ===================================
// MEDAS DIGITAL STAKING MANAGER
// Browser-Compatible Version (No ES6 imports)
// Uses global CosmJS objects loaded by HTML
// ===================================

class StakingManager {
    constructor() {
        this.chainId = 'medasdigital-2';
        this.rpcEndpoint = 'https://rpc.medas-digital.io:26657';
        this.lcdEndpoint = 'https://lcd.medas-digital.io:1317';
        
        this.gasPrice = '0.025umedas';
        this.defaultGas = '200000';
        
        // Wait for CosmJS to be available
        this.waitForCosmJS();
        
        console.log('🚀 StakingManager initialized (Browser Compatible Version)');
    }

    async waitForCosmJS() {
        // Check if CosmJS is already loaded
        if (window.SigningStargateClient && window.coins) {
            console.log('✅ CosmJS already available');
            return;
        }

        // Wait for CosmJS to load
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds
        
        while (attempts < maxAttempts) {
            if (window.SigningStargateClient && window.coins) {
                console.log('✅ CosmJS became available');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ CosmJS not available after timeout - some features may not work');
    }

    // ===================================
    // KEPLR CONNECTION
    // ===================================
    
    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr extension not found. Please install Keplr.');
            }

            console.log('🔗 Connecting to Keplr...');

            // Enable Keplr for this chain
            await window.keplr.enable(this.chainId);
            
            // Get the offline signer
            const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
            
            // Get account info
            const accounts = await offlineSigner.getAccounts();
            this.account = accounts[0];
            
            // Create signing client if CosmJS is available
            if (window.SigningStargateClient) {
                this.client = await window.SigningStargateClient.connectWithSigner(
                    this.rpcEndpoint, 
                    offlineSigner,
                    {
                        gasPrice: this.gasPrice
                    }
                );
                console.log('✅ CosmJS SigningStargateClient connected');
            } else {
                console.warn('⚠️ CosmJS not available - using fallback methods');
                this.offlineSigner = offlineSigner;
            }
            
            console.log('✅ Keplr connected!');
            console.log('📊 Account:', this.account.address);
            
            return {
                address: this.account.address,
                pubkey: this.account.pubkey,
                algo: this.account.algo
            };
            
        } catch (error) {
            console.error('❌ Connection failed:', error);
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    // ===================================
    // STAKING OPERATIONS (COSMJS STYLE)
    // ===================================

    async delegate(delegatorAddress, validatorAddress, amount) {
        try {
            console.log('🔄 Starting delegation...', { delegatorAddress, validatorAddress, amount });
            
            // Ensure we have a client
            if (!this.client) {
                if (window.SigningStargateClient && this.account) {
                    // Try to reconnect
                    await this.connectKeplr();
                } else {
                    throw new Error('Not connected to Keplr or CosmJS not available');
                }
            }
            
            // Create delegation message
            const amountInUmedas = this.parseAmount(amount);
            const coin = window.coins ? 
                window.coins(amountInUmedas, "umedas")[0] : 
                { denom: "umedas", amount: amountInUmedas.toString() };
            
            const msg = {
                typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                value: {
                    delegatorAddress,
                    validatorAddress,
                    amount: coin
                }
            };
            
            // Sign and broadcast
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                [msg],
                "auto",
                "Delegation via MedasDigital WebClient"
            );
            
            console.log('✅ Delegation successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed
            };
            
        } catch (error) {
            console.error('❌ Delegation failed:', error);
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    async undelegate(delegatorAddress, validatorAddress, amount) {
        try {
            console.log('🔄 Starting undelegation...', { delegatorAddress, validatorAddress, amount });
            
            if (!this.client) {
                await this.connectKeplr();
            }
            
            const amountInUmedas = this.parseAmount(amount);
            const coin = window.coins ? 
                window.coins(amountInUmedas, "umedas")[0] : 
                { denom: "umedas", amount: amountInUmedas.toString() };
            
            const msg = {
                typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
                value: {
                    delegatorAddress,
                    validatorAddress,
                    amount: coin
                }
            };
            
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                [msg],
                "auto",
                "Undelegation via MedasDigital WebClient"
            );
            
            console.log('✅ Undelegation successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed
            };
            
        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    async redelegate(delegatorAddress, srcValidatorAddress, dstValidatorAddress, amount) {
        try {
            console.log('🔄 Starting redelegation...', { delegatorAddress, srcValidatorAddress, dstValidatorAddress, amount });
            
            if (!this.client) {
                await this.connectKeplr();
            }
            
            const amountInUmedas = this.parseAmount(amount);
            const coin = window.coins ? 
                window.coins(amountInUmedas, "umedas")[0] : 
                { denom: "umedas", amount: amountInUmedas.toString() };
            
            const msg = {
                typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
                value: {
                    delegatorAddress,
                    validatorSrcAddress: srcValidatorAddress,
                    validatorDstAddress: dstValidatorAddress,
                    amount: coin
                }
            };
            
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                [msg],
                "auto",
                "Redelegation via MedasDigital WebClient"
            );
            
            console.log('✅ Redelegation successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed
            };
            
        } catch (error) {
            console.error('❌ Redelegation failed:', error);
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            console.log('🔄 Starting rewards claim...', { delegatorAddress, validatorAddresses });
            
            if (!this.client) {
                await this.connectKeplr();
            }
            
            // Create claim messages for each validator
            const messages = validatorAddresses.map(validatorAddress => ({
                typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
                value: {
                    delegatorAddress,
                    validatorAddress
                }
            }));
            
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                messages,
                "auto",
                "Claim rewards via MedasDigital WebClient"
            );
            
            console.log('✅ Rewards claim successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed
            };
            
        } catch (error) {
            console.error('❌ Rewards claim failed:', error);
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    async sendTokens(fromAddress, toAddress, amount, memo = "") {
        try {
            console.log('🔄 Starting token transfer...', { fromAddress, toAddress, amount });
            
            if (!this.client) {
                await this.connectKeplr();
            }
            
            const amountInUmedas = this.parseAmount(amount);
            const coins = window.coins ? 
                window.coins(amountInUmedas, "umedas") : 
                [{ denom: "umedas", amount: amountInUmedas.toString() }];
            
            const result = await this.client.sendTokens(
                fromAddress,
                toAddress,
                coins,
                "auto",
                memo || "Transfer via MedasDigital WebClient"
            );
            
            console.log('✅ Transfer successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height,
                gasUsed: result.gasUsed
            };
            
        } catch (error) {
            console.error('❌ Transfer failed:', error);
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    // ===================================
    // QUERY FUNCTIONS
    // ===================================

    async getValidators() {
        try {
            const response = await fetch(`${this.lcdEndpoint}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=200`);
            const data = await response.json();
            
            return data.validators || [];
        } catch (error) {
            console.error('❌ Failed to fetch validators:', error);
            return [];
        }
    }

    async getDelegations(delegatorAddress) {
        try {
            const response = await fetch(`${this.lcdEndpoint}/cosmos/staking/v1beta1/delegations/${delegatorAddress}`);
            const data = await response.json();
            
            return data.delegation_responses || [];
        } catch (error) {
            console.error('❌ Failed to fetch delegations:', error);
            return [];
        }
    }

    async getRewards(delegatorAddress) {
        try {
            const response = await fetch(`${this.lcdEndpoint}/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`);
            const data = await response.json();
            
            return data.rewards || [];
        } catch (error) {
            console.error('❌ Failed to fetch rewards:', error);
            return [];
        }
    }

    async getBalance(address) {
        try {
            if (this.client) {
                // Use CosmJS if available
                const balance = await this.client.getBalance(address, "umedas");
                return this.formatAmount(balance.amount);
            } else {
                // Fallback to LCD API
                const response = await fetch(`${this.lcdEndpoint}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=umedas`);
                const data = await response.json();
                
                return data.balance ? this.formatAmount(data.balance.amount) : "0.000000";
            }
        } catch (error) {
            console.error('❌ Failed to fetch balance:', error);
            return "0.000000";
        }
    }

    // ===================================
    // HELPER FUNCTIONS
    // ===================================
    
    formatAmount(amount, decimals = 6) {
        if (!amount || amount === '0') return '0.000000';
        return (parseFloat(amount) / Math.pow(10, decimals)).toFixed(6);
    }
    
    parseAmount(amount, decimals = 6) {
        return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
    }

    parseError(error) {
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied')) {
            return 'Transaction was cancelled by user';
        } else if (error.message?.includes('insufficient funds')) {
            return 'Insufficient balance for this transaction';
        } else if (error.message?.includes('out of gas')) {
            return 'Transaction ran out of gas';
        } else if (error.message?.includes('sequence mismatch')) {
            return 'Account sequence mismatch - please try again';
        } else {
            return error.message || 'Unknown error occurred';
        }
    }

    // Connection status
    isConnected() {
        return !!(this.client && this.account) || !!(this.offlineSigner && this.account);
    }

    getConnectionStatus() {
        return {
            hasClient: !!this.client,
            hasAccount: !!this.account,
            hasOfflineSigner: !!this.offlineSigner,
            address: this.account?.address,
            chainId: this.chainId,
            cosmjsAvailable: !!(window.SigningStargateClient && window.coins)
        };
    }
}

// ===================================
// GLOBAL VALIDATOR BUTTON ACTIONS
// ===================================

window.selectValidatorAction = function(button) {
    const validatorAddress = button.dataset.validatorAddress;
    const validatorName = button.dataset.validatorName;
    
    console.log('📊 Validator selected via button:', validatorName, validatorAddress);
    
    if (window.selectValidator) {
        window.selectValidator(validatorAddress, validatorName);
    } else {
        const validatorSelect = document.getElementById('validator-select');
        if (validatorSelect) {
            let option = Array.from(validatorSelect.options).find(opt => opt.value === validatorAddress);
            if (!option) {
                option = new Option(validatorName, validatorAddress);
                validatorSelect.add(option);
            }
            validatorSelect.value = validatorAddress;
            
            button.textContent = 'Selected!';
            button.style.borderColor = '#00ff00';
            button.style.color = '#00ff00';
            
            setTimeout(() => {
                button.textContent = 'Select';
                button.style.borderColor = '#00ffff';
                button.style.color = '#00ffff';
            }, 1500);
            
            console.log(`📊 Selected validator: ${validatorName} (${validatorAddress})`);
        }
    }
};

window.quickStakeAction = function(button) {
    const validatorAddress = button.dataset.validatorAddress;
    const validatorName = button.dataset.validatorName;
    
    console.log('🚀 Quick stake for validator:', validatorName);
    
    const selectButton = button.parentElement.querySelector('[data-validator-address="' + validatorAddress + '"]');
    if (selectButton && selectButton !== button) {
        window.selectValidatorAction(selectButton);
    } else {
        window.selectValidatorAction(button);
    }
    
    setTimeout(() => {
        const stakeInput = document.getElementById('stake-amount');
        if (stakeInput) {
            stakeInput.focus();
            stakeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

// ===================================
// TEST FUNCTION
// ===================================

window.testMedasOsmosisStyle = async function() {
    console.log('🧪 Testing Medas StakingManager (Browser Compatible)...');
    
    try {
        const stakingManager = new StakingManager();
        
        // Test CosmJS availability
        console.log('CosmJS available:', !!(window.SigningStargateClient && window.coins));
        console.log('Connection status:', stakingManager.getConnectionStatus());
        
        // Test validators fetch
        const validators = await stakingManager.getValidators();
        console.log(`✅ Fetched ${validators.length} validators`);
        
        if (window.keplr && window.terminal?.connected) {
            console.log('✅ Keplr connected, ready for transactions');
        } else {
            console.log('ℹ️ Connect Keplr to test transactions');
        }
        
        return 'StakingManager test completed - check console for details';
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return `Test failed: ${error.message}`;
    }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StakingManager;
} else {
    window.StakingManager = StakingManager;
    console.log('🚀 StakingManager loaded (Browser Compatible Version)');
}
