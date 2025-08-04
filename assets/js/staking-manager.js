// ===================================
// assets/js/staking-manager.js
// WeedWallet-Pattern für MedasDigital
// ===================================

class StakingManager {
    constructor() {
        this.client = null;
        this.account = null;
        this.chainId = 'medasdigital-2'; // Ihre Chain ID
        this.rpcUrl = 'https://rpc.medas-digital.io:26657';
        this.restUrl = 'https://lcd.medas-digital.io:1317';
        this.denom = 'umedas';
        this.coinType = 118;
        this.bech32Prefix = 'medas';
    }

    // ===================================
    // WEEDWALLET-PATTERN: Direkte Keplr Verbindung
    // ===================================
    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr extension not found');
            }

            // WeedWallet-Pattern: Chain vorschlagen falls unbekannt
            await this.suggestChain();
            
            // Keplr aktivieren
            await window.keplr.enable(this.chainId);
            
            // Offline Signer erstellen (WeedWallet-Pattern)
            const offlineSigner = window.getOfflineSigner(this.chainId);
            
            // SigningStargateClient erstellen (modern CosmJS)
            this.client = await SigningStargateClient.connectWithSigner(
                this.rpcUrl,
                offlineSigner,
                { gasPrice: GasPrice.fromString("0.025umedas") }
            );
            
            // Account Information
            const accounts = await offlineSigner.getAccounts();
            this.account = accounts[0];
            
            console.log('✅ WeedWallet-Pattern: Keplr connected', this.account.address);
            return this.account;
            
        } catch (error) {
            console.error('❌ Keplr connection failed:', error);
            throw error;
        }
    }

    // ===================================
    // WEEDWALLET-PATTERN: Chain Suggestion
    // ===================================
    async suggestChain() {
        const chainConfig = {
            chainId: this.chainId,
            chainName: 'MedasDigital',
            rpc: this.rpcUrl,
            rest: this.restUrl,
            bip44: { coinType: this.coinType },
            bech32Config: {
                bech32PrefixAccAddr: this.bech32Prefix,
                bech32PrefixAccPub: `${this.bech32Prefix}pub`,
                bech32PrefixValAddr: `${this.bech32Prefix}valoper`,
                bech32PrefixValPub: `${this.bech32Prefix}valoperpub`,
                bech32PrefixConsAddr: `${this.bech32Prefix}valcons`,
                bech32PrefixConsPub: `${this.bech32Prefix}valconspub`
            },
            currencies: [{
                coinDenom: 'MEDAS',
                coinMinimalDenom: this.denom,
                coinDecimals: 6
            }],
            feeCurrencies: [{
                coinDenom: 'MEDAS',
                coinMinimalDenom: this.denom,
                coinDecimals: 6,
                gasPriceStep: {
                    low: 0.01,
                    average: 0.025,
                    high: 0.04
                }
            }],
            stakeCurrency: {
                coinDenom: 'MEDAS',
                coinMinimalDenom: this.denom,
                coinDecimals: 6
            }
        };

        try {
            await window.keplr.experimentalSuggestChain(chainConfig);
            console.log('✅ Chain suggested to Keplr');
        } catch (error) {
            console.log('ℹ️ Chain suggestion failed (might already exist):', error.message);
        }
    }

    // ===================================
    // WEEDWALLET-PATTERN: Direkte CosmJS Delegation
    // ===================================
    async delegate(delegatorAddress, validatorAddress, amount) {
        try {
            console.log('🔄 WeedWallet-Pattern: Starting delegation...');
            
            if (!this.client) {
                await this.connectKeplr();
            }

            // Amount in umedas (WeedWallet does this)
            const amountInUmedas = parseFloat(amount) * 1000000;
            const coin = { denom: this.denom, amount: amountInUmedas.toString() };

            // Create MsgDelegate (Standard Cosmos SDK)
            const msg = {
                typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                value: {
                    delegatorAddress,
                    validatorAddress,
                    amount: coin
                }
            };

            // WeedWallet-Pattern: Direct broadcast mit auto gas
            const result = await this.client.signAndBroadcast(
                delegatorAddress,
                [msg],
                "auto", // Auto gas estimation
                "Delegation via MedasDigital WebClient"
            );

            console.log('✅ WeedWallet-Pattern: Delegation successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height
            };
            
        } catch (error) {
            console.error('❌ WeedWallet-Pattern: Delegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // WEEDWALLET-PATTERN: Direkte Undelegation
    // ===================================
    async undelegate(delegatorAddress, validatorAddress, amount) {
        try {
            console.log('🔄 WeedWallet-Pattern: Starting undelegation...');
            
            if (!this.client) {
                await this.connectKeplr();
            }

            const amountInUmedas = parseFloat(amount) * 1000000;
            const coin = { denom: this.denom, amount: amountInUmedas.toString() };

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

            console.log('✅ WeedWallet-Pattern: Undelegation successful:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height
            };
            
        } catch (error) {
            console.error('❌ WeedWallet-Pattern: Undelegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // WEEDWALLET-PATTERN: Rewards Claiming
    // ===================================
    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            console.log('🔄 WeedWallet-Pattern: Claiming rewards...');
            
            if (!this.client) {
                await this.connectKeplr();
            }

            // Mehrere Validators auf einmal (WeedWallet macht das so)
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

            console.log('✅ WeedWallet-Pattern: Rewards claimed:', result);
            
            return {
                success: true,
                txHash: result.transactionHash,
                height: result.height
            };
            
        } catch (error) {
            console.error('❌ WeedWallet-Pattern: Claiming failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // WEEDWALLET-PATTERN: Send Tokens
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

    // ===================================
    // HELPER: Error Handling (WeedWallet-Style)
    // ===================================
    parseError(error) {
        if (error.message?.includes('user rejected')) {
            return 'Transaction cancelled by user';
        }
        if (error.message?.includes('insufficient funds')) {
            return 'Insufficient balance for transaction';
        }
        if (error.message?.includes('gas')) {
            return 'Gas estimation failed - try again';
        }
        return error.message || 'Unknown error occurred';
    }
}

// ===================================
// GLOBALE FUNKTIONEN (für Ihre UI)
// ===================================

// Global StakingManager instance
window.stakingManager = new StakingManager();

// Global delegate function (für UI buttons)
window.delegateTokens = async function(validatorAddress, amount) {
    try {
        if (!window.terminal?.account?.address) {
            throw new Error('Please connect your wallet first');
        }
        
        const result = await window.stakingManager.delegate(
            window.terminal.account.address,
            validatorAddress,
            amount
        );
        
        if (result.success) {
            window.uiManager?.showNotification(
                `✅ Successfully delegated ${amount} MEDAS!`,
                'success'
            );
            
            // Refresh delegations
            if (window.uiManager?.populateUserDelegations) {
                window.uiManager.populateUserDelegations(window.terminal.account.address);
            }
        } else {
            throw new Error(result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Delegation failed:', error);
        window.uiManager?.showNotification(
            `❌ Delegation failed: ${error.message}`,
            'error'
        );
        throw error;
    }
};

// Global undelegate function
window.undelegateTokens = async function(validatorAddress, amount) {
    try {
        if (!window.terminal?.account?.address) {
            throw new Error('Please connect your wallet first');
        }
        
        const result = await window.stakingManager.undelegate(
            window.terminal.account.address,
            validatorAddress,
            amount
        );
        
        if (result.success) {
            window.uiManager?.showNotification(
                `✅ Successfully undelegated ${amount} MEDAS! (21-day unbonding period)`,
                'success'
            );
            
            // Refresh delegations
            if (window.uiManager?.populateUserDelegations) {
                window.uiManager.populateUserDelegations(window.terminal.account.address);
            }
        } else {
            throw new Error(result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Undelegation failed:', error);
        window.uiManager?.showNotification(
            `❌ Undelegation failed: ${error.message}`,
            'error'
        );
        throw error;
    }
};

// Global claim rewards function
window.claimAllRewards = async function() {
    try {
        if (!window.terminal?.account?.address) {
            throw new Error('Please connect your wallet first');
        }
        
        // Get all delegated validators
        const delegations = await window.uiManager?.fetchUserDelegations?.(window.terminal.account.address);
        if (!delegations || delegations.length === 0) {
            throw new Error('No delegations found');
        }
        
        const validatorAddresses = delegations.map(d => d.delegation.validator_address);
        
        const result = await window.stakingManager.claimRewards(
            window.terminal.account.address,
            validatorAddresses
        );
        
        if (result.success) {
            window.uiManager?.showNotification(
                `✅ Successfully claimed all rewards!`,
                'success'
            );
            
            // Refresh data
            if (window.uiManager?.populateUserDelegations) {
                window.uiManager.populateUserDelegations(window.terminal.account.address);
            }
        } else {
            throw new Error(result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Claim rewards failed:', error);
        window.uiManager?.showNotification(
            `❌ Claim failed: ${error.message}`,
            'error'
        );
        throw error;
    }
};

console.log('✅ MedasDigital StakingManager loaded!');
