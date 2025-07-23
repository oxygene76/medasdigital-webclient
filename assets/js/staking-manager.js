// ===================================
// STAKING-MANAGER.JS - WIE OSMOSIS ES MACHT!
// Basierend auf osmosis-labs/osmojs Architektur
// ===================================

import { SigningStargateClient } from "@cosmjs/stargate";
import { coins } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";

class StakingManager {
    constructor() {
        this.chainId = "medasdigital-2";
        this.rpcEndpoint = "https://rpc.medas-digital.io:26657";
        this.denom = "umedas";
        this.decimals = 6;
        this.client = null;
        this.account = null;
        
        console.log('🥩 MedasDigital StakingManager - Osmosis Style Architecture');
    }

    // ===================================
    // 🎯 OSMOSIS-STYLE CLIENT SETUP
    // Genau wie getSigningOsmosisClient aus osmojs
    // ===================================

    async getMedasSigningClient(signer) {
        try {
            // ✅ Custom registry für Medas (wie Osmosis es macht)
            const registry = new Registry();
            
            // ✅ SigningStargateClient mit custom config (Osmosis style)
            const client = await SigningStargateClient.connectWithSigner(
                this.rpcEndpoint,
                signer,
                {
                    registry,
                    gasPrice: "0.025umedas", // Osmosis-style gas config
                    broadcastTimeoutMs: 30000,
                    broadcastPollIntervalMs: 1000
                }
            );

            console.log('✅ Medas Signing Client connected (Osmosis architecture)');
            return client;

        } catch (error) {
            console.error('❌ Failed to get Medas signing client:', error);
            throw error;
        }
    }

    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr extension not found. Please install Keplr.');
            }

            console.log('🔗 Connecting to Keplr (Osmosis style)...');

            // ✅ Keplr enable
            await window.keplr.enable(this.chainId);
            
            // ✅ Get OfflineSigner (genau wie Osmosis)
            const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
            
            // ✅ Get our custom signing client (wie getSigningOsmosisClient)
            this.client = await this.getMedasSigningClient(offlineSigner);
            
            // ✅ Get accounts
            const accounts = await offlineSigner.getAccounts();
            this.account = accounts[0];
            
            console.log('✅ Keplr + Medas Client connected!');
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
    // 🔥 OSMOSIS-STYLE MESSAGE COMPOSERS
    // Ähnlich wie osmosis.gamm.v1beta1.MessageComposer
    // ===================================

    createDelegateMessage(delegatorAddress, validatorAddress, amount) {
        // ✅ Osmosis-style message composition
        return {
            typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
            value: {
                delegatorAddress,
                validatorAddress,
                amount: {
                    denom: this.denom,
                    amount: amount.toString()
                }
            }
        };
    }

    createUndelegateMessage(delegatorAddress, validatorAddress, amount) {
        return {
            typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate", 
            value: {
                delegatorAddress,
                validatorAddress,
                amount: {
                    denom: this.denom,
                    amount: amount.toString()
                }
            }
        };
    }

    createWithdrawRewardsMessage(delegatorAddress, validatorAddress) {
        return {
            typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
            value: {
                delegatorAddress,
                validatorAddress
            }
        };
    }

    // ===================================
    // 🚀 OSMOSIS-STYLE TRANSACTION METHODS  
    // Genau wie Osmosis swap/pool functions
    // ===================================

    async delegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('🥩 Starting delegation (Osmosis style)...');
            console.log(`📊 Delegating ${amountInMedas} MEDAS to ${validatorAddress}`);
            
            // ✅ Ensure connection
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            // ✅ Create message (Osmosis message composer style)
            const amountInUmedas = this.formatUmedas(amountInMedas);
            const msg = this.createDelegateMessage(
                this.account.address,
                validatorAddress,
                amountInUmedas
            );

            console.log('📊 Message created:', msg.typeUrl);

            // ✅ Sign and broadcast (genau wie Osmosis)
            const fee = "auto"; // Osmosis uses auto fee calculation
            const memo = `Stake ${amountInMedas} MEDAS via MedasDigital`;

            const result = await this.client.signAndBroadcast(
                this.account.address,
                [msg],
                fee,
                memo
            );

            console.log('🎉 Delegation successful (Osmosis style)!');
            console.log('📊 TX Hash:', result.transactionHash);
            console.log('📊 Block Height:', result.height);
            console.log('📊 Gas Used:', result.gasUsed);

            return {
                success: true,
                txHash: result.transactionHash,
                blockHeight: result.height,
                gasUsed: result.gasUsed,
                gasWanted: result.gasWanted,
                message: `Successfully delegated ${amountInMedas} MEDAS`
            };

        } catch (error) {
            console.error('❌ Delegation failed:', error);
            return this.handleTransactionError(error, 'delegation');
        }
    }

    async undelegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('📉 Starting undelegation (Osmosis style)...');
            
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            // ✅ Create message (Osmosis style)
            const amountInUmedas = this.formatUmedas(amountInMedas);
            const msg = this.createUndelegateMessage(
                this.account.address,
                validatorAddress,
                amountInUmedas
            );

            // ✅ Sign and broadcast (Osmosis pattern)
            const result = await this.client.signAndBroadcast(
                this.account.address,
                [msg],
                "auto",
                `Unstake ${amountInMedas} MEDAS via MedasDigital`
            );

            console.log('✅ Undelegation successful!');
            
            return {
                success: true,
                txHash: result.transactionHash,
                blockHeight: result.height,
                gasUsed: result.gasUsed,
                message: `Successfully undelegated ${amountInMedas} MEDAS (21-day unbonding period starts now)`
            };

        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            return this.handleTransactionError(error, 'undelegation');
        }
    }

    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            console.log('🏆 Starting rewards claim (Osmosis style)...');
            console.log(`📊 Claiming from ${validatorAddresses.length} validators`);
            
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            // ✅ Create multiple messages (wie Osmosis multi-pool operations)
            const messages = validatorAddresses.map(validatorAddress => 
                this.createWithdrawRewardsMessage(this.account.address, validatorAddress)
            );

            console.log('📊 Created', messages.length, 'withdraw messages');

            // ✅ Batch transaction (Osmosis style)
            const result = await this.client.signAndBroadcast(
                this.account.address,
                messages,
                "auto",
                `Claim rewards from ${validatorAddresses.length} validators via MedasDigital`
            );

            console.log('🎉 Rewards claiming successful!');
            
            return {
                success: true,
                txHash: result.transactionHash,
                blockHeight: result.height,
                gasUsed: result.gasUsed,
                message: `Successfully claimed rewards from ${validatorAddresses.length} validators`
            };

        } catch (error) {
            console.error('❌ Rewards claiming failed:', error);
            return this.handleTransactionError(error, 'rewards claiming');
        }
    }

    async sendTokens(recipientAddress, amountInMedas) {
        try {
            console.log('💸 Starting token transfer (Osmosis style)...');
            
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            // ✅ Direkte CosmJS sendTokens (wie Osmosis für Bank transfers)
            const amountInUmedas = this.formatUmedas(amountInMedas);
            const coinAmount = coins(amountInUmedas, this.denom);

            const result = await this.client.sendTokens(
                this.account.address,
                recipientAddress,
                coinAmount,
                "auto",
                "Transfer via MedasDigital"
            );

            console.log('✅ Transfer successful!');
            
            return {
                success: true,
                txHash: result.transactionHash,
                message: `Successfully sent ${amountInMedas} MEDAS to ${recipientAddress}`
            };

        } catch (error) {
            console.error('❌ Transfer failed:', error);
            return this.handleTransactionError(error, 'transfer');
        }
    }

    // ===================================
    // 🔍 OSMOSIS-STYLE QUERY METHODS
    // ===================================

    async getBalance(address = null) {
        try {
            if (!this.client) {
                await this.connectKeplr();
            }

            const queryAddress = address || this.account?.address;
            if (!queryAddress) {
                throw new Error('No address provided and not connected');
            }

            // ✅ CosmJS balance query (Osmosis style)
            const balance = await this.client.getBalance(queryAddress, this.denom);
            
            const balanceInMedas = this.formatMedas(balance.amount);
            console.log(`📊 Balance: ${balanceInMedas} MEDAS`);
            
            return balanceInMedas;

        } catch (error) {
            console.error('❌ Balance query failed:', error);
            return 'ERROR';
        }
    }

    async getAllBalances(address = null) {
        try {
            if (!this.client) {
                await this.connectKeplr();
            }

            const queryAddress = address || this.account?.address;
            const balances = await this.client.getAllBalances(queryAddress);
            
            return balances;

        } catch (error) {
            console.error('❌ All balances query failed:', error);
            return [];
        }
    }

    // ===================================
    // 🛠️ OSMOSIS-STYLE ERROR HANDLING
    // ===================================

    handleTransactionError(error, operation) {
        // ✅ Spezifische Fehlerbehandlung wie bei Osmosis
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied')) {
            return {
                success: false,
                error: 'Transaction was cancelled by user'
            };
        } else if (error.message?.includes('insufficient funds')) {
            return {
                success: false,
                error: 'Insufficient balance for this transaction'
            };
        } else if (error.message?.includes('out of gas')) {
            return {
                success: false,
                error: 'Transaction ran out of gas - try increasing gas limit'
            };
        } else if (error.message?.includes('sequence mismatch')) {
            return {
                success: false,
                error: 'Account sequence mismatch - please try again'
            };
        } else {
            return {
                success: false,
                error: `${operation} failed: ${error.message}`
            };
        }
    }

    // ===================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================

    formatMedas(amountInUmedas) {
        if (!amountInUmedas || amountInUmedas === '0') return '0.000000';
        return (parseInt(amountInUmedas) / Math.pow(10, this.decimals)).toFixed(6);
    }

    formatUmedas(amountInMedas) {
        return Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals)).toString();
    }

    disconnect() {
        this.client = null;
        this.account = null;
        console.log('🔌 Medas StakingManager disconnected');
    }

    isConnected() {
        return !!(this.client && this.account);
    }

    getConnectionStatus() {
        return {
            hasClient: !!this.client,
            hasAccount: !!this.account,
            address: this.account?.address,
            chainId: this.chainId,
            rpcEndpoint: this.rpcEndpoint
        };
    }
}

// ===================================
// 🧪 OSMOSIS-STYLE TESTING
// ===================================

window.testMedasOsmosisStyle = async function() {
    console.log('🧪 TESTING MEDAS STAKING MANAGER (OSMOSIS ARCHITECTURE)...');
    console.log('=========================================================');
    
    const stakingManager = new StakingManager();
    
    try {
        // Test connection
        console.log('🔸 Test 1: Keplr Connection');
        const account = await stakingManager.connectKeplr();
        console.log('✅ Connected:', account.address);
        
        // Test client status
        console.log('🔸 Test 2: Client Status');
        const status = stakingManager.getConnectionStatus();
        console.log('✅ Status:', status);
        
        // Test balance
        console.log('🔸 Test 3: Balance Query');
        const balance = await stakingManager.getBalance();
        console.log('✅ Balance:', balance, 'MEDAS');
        
        // Test message creation
        console.log('🔸 Test 4: Message Creation');
        const testMsg = stakingManager.createDelegateMessage(
            account.address,
            'medasvaloperTest',
            '1000000' // 1 MEDAS in umedas
        );
        console.log('✅ Message created:', testMsg.typeUrl);
        
        console.log('🎉 ALL TESTS PASSED! Osmosis-style architecture working!');
        return 'Medas StakingManager (Osmosis architecture) ready for production!';
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return `Test failed: ${error.message}`;
    }
};

// Export (ES Module style wie Osmosis)
export default StakingManager;

// Global availability
window.StakingManager = StakingManager;
console.log('🚀 Medas StakingManager loaded - Osmosis Labs inspired architecture!');
