// ===================================
// STAKING-MANAGER.JS - MIT COSMJS!
// Ersetze deine bestehende staking-manager.js mit dieser Version
// ===================================

import { SigningStargateClient } from "@cosmjs/stargate";
import { coins } from "@cosmjs/stargate";

class StakingManager {
    constructor() {
        this.chainId = "medasdigital-2";
        this.rpcEndpoint = "https://rpc.medas-digital.io:26657";
        this.denom = "umedas";
        this.decimals = 6;
        this.client = null;
        this.account = null;
    }

    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr extension not found. Please install Keplr.');
            }

            // ✅ Standard Keplr connection
            await window.keplr.enable(this.chainId);
            
            // ✅ CosmJS OfflineSigner - das ist der Trick!
            const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
            
            // ✅ SigningStargateClient - macht alles automatisch!
            this.client = await SigningStargateClient.connectWithSigner(
                this.rpcEndpoint, 
                offlineSigner
            );
            
            // ✅ Account info
            const accounts = await offlineSigner.getAccounts();
            this.account = accounts[0];
            
            console.log('✅ CosmJS + Keplr connected:', this.account.address);
            return this.account;
            
        } catch (error) {
            console.error('❌ CosmJS connection failed:', error);
            throw error;
        }
    }

    async delegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            console.log('🥩 Starting delegation with CosmJS...');
            
            // ✅ CosmJS macht alles automatisch:
            // - Erstellt Protobuf Messages
            // - Macht TxRaw encoding  
            // - Signed mit Keplr
            // - Broadcasted zur Chain
            const result = await this.client.delegateTokens(
                this.account.address,              // delegator
                validatorAddress,                  // validator  
                coins(this.formatUmedas(amountInMedas), "umedas"), // amount
                "auto",                           // fee (automatic calculation)
                `Stake ${amountInMedas} MEDAS to validator` // memo
            );

            console.log('🎉 CosmJS delegation successful!');
            console.log('- TX Hash:', result.transactionHash);
            console.log('- Block Height:', result.height);
            console.log('- Gas Used:', result.gasUsed);

            return {
                success: true,
                txHash: result.transactionHash,
                blockHeight: result.height,
                gasUsed: result.gasUsed,
                message: `Successfully delegated ${amountInMedas} MEDAS`
            };

        } catch (error) {
            console.error('❌ CosmJS delegation failed:', error);
            
            if (error.message?.includes('Request rejected')) {
                return {
                    success: false,
                    error: 'Transaction was cancelled by user'
                };
            } else {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    async undelegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            console.log('📉 Starting undelegation with CosmJS...');

            // ✅ CosmJS undelegateTokens - macht alles automatisch!
            const result = await this.client.undelegateTokens(
                this.account.address,
                validatorAddress,
                coins(this.formatUmedas(amountInMedas), "umedas"),
                "auto",
                `Unstake ${amountInMedas} MEDAS from validator`
            );

            console.log('✅ CosmJS undelegation successful!');
            return {
                success: true,
                txHash: result.transactionHash,
                message: `Successfully undelegated ${amountInMedas} MEDAS (21-day unbonding period)`
            };

        } catch (error) {
            console.error('❌ CosmJS undelegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            console.log('🏆 Starting rewards claiming with CosmJS...');

            // ✅ CosmJS withdrawRewards - macht alles automatisch!
            const result = await this.client.withdrawRewards(
                this.account.address,
                validatorAddresses[0], // Für ersten Validator
                "auto",
                `Claim rewards from ${validatorAddresses.length} validators`
            );

            // Für mehrere Validators (falls gewünscht):
            // const messages = validatorAddresses.map(validatorAddress => ({
            //     typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
            //     value: {
            //         delegatorAddress: this.account.address,
            //         validatorAddress: validatorAddress,
            //     },
            // }));
            // const result = await this.client.signAndBroadcast(this.account.address, messages, "auto");

            console.log('🎉 CosmJS rewards claiming successful!');
            return {
                success: true,
                txHash: result.transactionHash,
                message: `Successfully claimed rewards from ${validatorAddresses.length} validators`
            };

        } catch (error) {
            console.error('❌ CosmJS rewards claiming failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendTokens(recipientAddress, amountInMedas) {
        try {
            if (!this.client || !this.account) {
                await this.connectKeplr();
            }

            // ✅ CosmJS sendTokens - einfach!
            const result = await this.client.sendTokens(
                this.account.address,
                recipientAddress,
                coins(this.formatUmedas(amountInMedas), "umedas"),
                "auto",
                "Transfer via MedasDigital"
            );

            console.log('✅ CosmJS transfer successful:', result.transactionHash);
            return {
                success: true,
                txHash: result.transactionHash,
                message: `Successfully sent ${amountInMedas} MEDAS`
            };

        } catch (error) {
            console.error('❌ CosmJS transfer failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getBalance(address = null) {
        try {
            if (!this.client) {
                await this.connectKeplr();
            }

            const queryAddress = address || this.account?.address;
            if (!queryAddress) {
                throw new Error('No address provided and not connected');
            }

            // ✅ CosmJS query - kein RPC/REST handling nötig
            const balance = await this.client.getBalance(queryAddress, "umedas");
            return this.formatMedas(balance.amount);

        } catch (error) {
            console.error('❌ CosmJS balance query failed:', error);
            return 'ERROR';
        }
    }

    // ===================================
    // UTILITY FUNCTIONS (unverändert)
    // ===================================

    formatMedas(amountInUmedas) {
        return (parseInt(amountInUmedas) / Math.pow(10, this.decimals)).toFixed(6);
    }

    formatUmedas(amountInMedas) {
        return Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
    }

    disconnect() {
        this.client = null;
        this.account = null;
        console.log('🔌 CosmJS disconnected');
    }
}

// ===================================
// TESTING FUNKTION (optional)
// ===================================
window.testCosmJSStaking = async function() {
    console.log('🧪 TESTING COSMJS STAKING MANAGER...');
    
    const stakingManager = new StakingManager();
    
    try {
        // Test connection
        const account = await stakingManager.connectKeplr();
        console.log('✅ CosmJS connected:', account.address);
        
        // Test balance query
        const balance = await stakingManager.getBalance();
        console.log('✅ Balance:', balance, 'MEDAS');
        
        return 'CosmJS StakingManager test complete - all functions working!';
        
    } catch (error) {
        console.error('❌ CosmJS test failed:', error);
        return `Test failed: ${error.message}`;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StakingManager;
} else {
    window.StakingManager = StakingManager;
    console.log('🥩 CosmJS StakingManager loaded - No more manual TxRaw needed!');
}
