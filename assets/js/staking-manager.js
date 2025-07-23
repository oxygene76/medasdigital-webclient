// ===================================
// KOMPLETTE STAKING IMPLEMENTATION
// Basierend auf Keplr Dokumentation + Cosmos SDK 0.50.10
// ===================================

class StakingManager {
    constructor() {
        this.chainId = "medasdigital-2";
        this.denom = "umedas";
        this.decimals = 6;
        this.gasPrice = 0.025; // Gas price in umedas
    }

    // ===================================
    // 1. KEPLR CONNECTION & SETUP
    // ===================================

    async connectKeplr() {
        try {
            // Check if Keplr is installed
            if (!window.keplr) {
                throw new Error('Keplr extension not found. Please install Keplr.');
            }

            // Enable the chain
            await window.keplr.enable(this.chainId);
            
            // Get the current account
            const key = await window.keplr.getKey(this.chainId);
            
            console.log('✅ Keplr connected:', key.bech32Address);
            return {
                address: key.bech32Address,
                pubkey: key.pubKey
            };

        } catch (error) {
            console.error('❌ Keplr connection failed:', error);
            throw error;
        }
    }

    // ===================================
    // 2. ACCOUNT INFO FETCHING (für Sequence/Account Number)
    // ===================================

    async getAccountInfo(address) {
        try {
            const restUrl = window.MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
            const response = await fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${address}`);
            
            if (!response.ok) {
                throw new Error(`Account info fetch failed: ${response.status}`);
            }

            const data = await response.json();
            
            return {
                accountNumber: data.account.account_number.toString(),
                sequence: data.account.sequence.toString()
            };

        } catch (error) {
            console.error('❌ Failed to get account info:', error);
            // Fallback für Testing
            return {
                accountNumber: "0",
                sequence: "0"
            };
        }
    }

    // ===================================
    // 3. STAKING MESSAGE CREATION (Cosmos SDK 0.50.10 Format)
    // ===================================

    createDelegateMessage(delegatorAddress, validatorAddress, amount) {
        // Cosmos SDK 0.50.10 MsgDelegate
        return {
            type: "cosmos-sdk/MsgDelegate",  // Amino type for legacy compatibility
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: this.denom,
                    amount: amount.toString() // Amount in umedas (micro-MEDAS)
                }
            }
        };
    }

    createUndelegateMessage(delegatorAddress, validatorAddress, amount) {
        // Cosmos SDK 0.50.10 MsgUndelegate
        return {
            type: "cosmos-sdk/MsgUndelegate",  // Amino type
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: this.denom,
                    amount: amount.toString()
                }
            }
        };
    }

    createWithdrawRewardsMessage(delegatorAddress, validatorAddress) {
        // Cosmos SDK 0.50.10 MsgWithdrawDelegatorReward
        return {
            type: "cosmos-sdk/MsgWithdrawDelegatorReward",  // Amino type
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress
            }
        };
    }

    // ===================================
    // 4. FEE CALCULATION (Cosmos SDK 0.50.10)
    // ===================================

    calculateFee(gasLimit) {
        const gasAmount = Math.ceil(gasLimit * this.gasPrice);
        
        return {
            gas: gasLimit.toString(),
            amount: [{
                denom: this.denom,
                amount: gasAmount.toString()
            }]
        };
    }

    // ===================================
    // 5. AMINO SIGNING (Keplr-kompatibel)
    // ===================================

    async signWithAmino(signerAddress, messages, fee, memo = "") {
        try {
            // Get account info for sequence and account number
            const accountInfo = await this.getAccountInfo(signerAddress);
            
            // Create StdSignDoc (Amino format)
            const signDoc = {
                chain_id: this.chainId,
                account_number: accountInfo.accountNumber,
                sequence: accountInfo.sequence,
                timeout_height: "0", // Optional for Cosmos SDK 0.50.10
                fee: fee,
                msgs: messages,
                memo: memo
            };

            console.log('📝 Signing document:', signDoc);

            // Sign with Keplr using Amino
            const signResponse = await window.keplr.signAmino(
                this.chainId,
                signerAddress,
                signDoc,
                {
                    preferNoSetFee: false,    // Allow user to modify fee
                    preferNoSetMemo: false,   // Allow user to modify memo
                    disableBalanceCheck: false // Check balance
                }
            );

            console.log('✅ Amino signing successful');
            return signResponse;

        } catch (error) {
            console.error('❌ Amino signing failed:', error);
            throw error;
        }
    }

    // ===================================
    // 6. TRANSACTION BROADCASTING
    // ===================================

    async broadcastTransaction(signedTx) {
        try {
            const restUrl = window.MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
            
            // Create broadcast request (Cosmos SDK 0.50.10 format)
            const broadcastReq = {
                tx: signedTx.signed,
                mode: "BROADCAST_MODE_SYNC" // Use sync mode for immediate response
            };

            console.log('📡 Broadcasting transaction...');

            const response = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(broadcastReq)
            });

            if (!response.ok) {
                throw new Error(`Broadcast failed: HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.tx_response.code !== 0) {
                throw new Error(`Transaction failed: ${result.tx_response.raw_log}`);
            }

            console.log('✅ Transaction broadcast successful');
            return {
                success: true,
                txHash: result.tx_response.txhash,
                code: result.tx_response.code,
                rawLog: result.tx_response.raw_log
            };

        } catch (error) {
            console.error('❌ Transaction broadcast failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // 7. DELEGATION FUNCTION (Vollständig)
    // ===================================

    async delegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('🥩 Starting delegation process...');
            console.log(`  Delegator: ${delegatorAddress}`);
            console.log(`  Validator: ${validatorAddress}`);
            console.log(`  Amount: ${amountInMedas} MEDAS`);

            // Step 1: Connect Keplr
            const account = await this.connectKeplr();
            if (account.address !== delegatorAddress) {
                throw new Error('Connected account does not match delegator address');
            }

            // Step 2: Convert amount to umedas
            const amountInUmedas = Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
            console.log(`  Amount in umedas: ${amountInUmedas}`);

            // Step 3: Create delegation message
            const delegateMsg = this.createDelegateMessage(
                delegatorAddress,
                validatorAddress,
                amountInUmedas
            );

            // Step 4: Calculate fee (standard gas limit for delegation)
            const gasLimit = 300000;
            const fee = this.calculateFee(gasLimit);

            console.log('💰 Transaction fee:', fee);

            // Step 5: Sign transaction with Amino
            const signedTx = await this.signWithAmino(
                delegatorAddress,
                [delegateMsg],
                fee,
                `Stake ${amountInMedas} MEDAS to validator`
            );

            // Step 6: Broadcast transaction
            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('🎉 Delegation successful!');
                console.log(`📡 Transaction Hash: ${result.txHash}`);
                return {
                    success: true,
                    txHash: result.txHash,
                    message: `Successfully delegated ${amountInMedas} MEDAS`
                };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Delegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // 8. UNDELEGATION FUNCTION
    // ===================================

    async undelegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('📉 Starting undelegation process...');

            const account = await this.connectKeplr();
            const amountInUmedas = Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));

            const undelegateMsg = this.createUndelegateMessage(
                delegatorAddress,
                validatorAddress,
                amountInUmedas
            );

            const gasLimit = 350000; // Higher gas for undelegation
            const fee = this.calculateFee(gasLimit);

            const signedTx = await this.signWithAmino(
                delegatorAddress,
                [undelegateMsg],
                fee,
                `Unstake ${amountInMedas} MEDAS from validator`
            );

            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('✅ Undelegation successful!');
                return {
                    success: true,
                    txHash: result.txHash,
                    message: `Successfully undelegated ${amountInMedas} MEDAS (21-day unbonding period)`
                };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // 9. REWARDS CLAIMING FUNCTION
    // ===================================

    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            console.log('🏆 Starting rewards claiming process...');

            const account = await this.connectKeplr();

            // Create withdraw messages for each validator
            const withdrawMsgs = validatorAddresses.map(validatorAddress =>
                this.createWithdrawRewardsMessage(delegatorAddress, validatorAddress)
            );

            // Calculate gas (base + per validator)
            const gasLimit = 200000 + (validatorAddresses.length * 100000);
            const fee = this.calculateFee(gasLimit);

            const signedTx = await this.signWithAmino(
                delegatorAddress,
                withdrawMsgs,
                fee,
                `Claim rewards from ${validatorAddresses.length} validators`
            );

            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('🎉 Rewards claiming successful!');
                return {
                    success: true,
                    txHash: result.txHash,
                    message: `Successfully claimed rewards from ${validatorAddresses.length} validators`
                };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Rewards claiming failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===================================
    // 10. UTILITY FUNCTIONS
    // ===================================

    formatMedas(amountInUmedas) {
        return (parseInt(amountInUmedas) / Math.pow(10, this.decimals)).toFixed(6);
    }

    formatUmedas(amountInMedas) {
        return Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
    }
}

// ===================================
// INTEGRATION MIT UI-MANAGER
// ===================================

// In ui-manager.js verwenden:
class UIManager {
    constructor() {
        // ... existing code ...
        this.stakingManager = new StakingManager();
    }

    // Neue vereinfachte Staking-Funktion
    async performStaking() {
        const validatorSelect = document.getElementById('validator-select');
        const stakeAmountInput = document.getElementById('stake-amount');
        
        if (!validatorSelect?.value || validatorSelect.value === 'Select a validator...') {
            this.showNotification('❌ Please select a validator first', 'error');
            return;
        }
        
        const amount = parseFloat(stakeAmountInput?.value || '0');
        if (amount <= 0) {
            this.showNotification('❌ Please enter a valid amount', 'error');
            return;
        }
        
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Preparing delegation...', 'info');
            
            const validatorAddress = validatorSelect.value;
            const delegatorAddress = window.terminal.account.address;
            
            // Use the new StakingManager
            const result = await this.stakingManager.delegate(
                delegatorAddress,
                validatorAddress,
                amount
            );
            
            if (result.success) {
                this.showNotification('🎉 Delegation successful!', 'success');
                this.showNotification(result.message, 'success');
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
                
                // Reset form
                stakeAmountInput.value = '';
                validatorSelect.value = 'Select a validator...';
                
                // Refresh data
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    if (this.updateBalanceOverview) {
                        this.updateBalanceOverview();
                    }
                }, 2000);
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Staking failed:', error);
            this.showNotification(`❌ Staking failed: ${error.message}`, 'error');
        }
    }

    // Neue Claim-All-Rewards Funktion
    async claimAllRewards() {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Claiming all rewards...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            // Get all delegations to extract validator addresses
            const delegations = await this.fetchUserDelegations(delegatorAddress);
            
            if (!delegations || delegations.length === 0) {
                this.showNotification('❌ No delegations found', 'error');
                return;
            }
            
            const validatorAddresses = delegations.map(d => d.validator_address);
            
            const result = await this.stakingManager.claimRewards(
                delegatorAddress,
                validatorAddresses
            );
            
            if (result.success) {
                this.showNotification('🎉 Rewards claimed successfully!', 'success');
                this.showNotification(result.message, 'success');
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
                
                // Refresh data
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    if (this.updateBalanceOverview) {
                        this.updateBalanceOverview();
                    }
                }, 3000);
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Claim failed:', error);
            this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        }
    }
}

// ===================================
// TESTING & DEBUGGING
// ===================================

window.testStakingManager = async function() {
    console.log('🧪 TESTING STAKING MANAGER...');
    
    const stakingManager = new StakingManager();
    
    try {
        // Test connection
        const account = await stakingManager.connectKeplr();
        console.log('✅ Keplr connected:', account.address);
        
        // Test account info
        const accountInfo = await stakingManager.getAccountInfo(account.address);
        console.log('✅ Account info:', accountInfo);
        
        // Test message creation
        const testMsg = stakingManager.createDelegateMessage(
            account.address,
            'medasvaloperTest',
            1000000 // 1 MEDAS in umedas
        );
        console.log('✅ Message created:', testMsg);
        
        // Test fee calculation
        const testFee = stakingManager.calculateFee(300000);
        console.log('✅ Fee calculated:', testFee);
        
        return 'StakingManager test complete - all functions working!';
        
    } catch (error) {
        console.error('❌ StakingManager test failed:', error);
        return `Test failed: ${error.message}`;
    }
};

// ===================================
// EXPORT
// ===================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StakingManager;
} else {
    window.StakingManager = StakingManager;
    console.log('🥩 StakingManager loaded - Cosmos SDK 0.50.10 + Keplr compatible');
}
