// ===================================
// 1. NEUE DATEI: assets/js/staking-manager.js
// ===================================

class StakingManager {
    constructor() {
        this.chainId = "medasdigital-2";
        this.denom = "umedas";
        this.decimals = 6;
        this.gasPrice = 0.025;
    }

    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr extension not found. Please install Keplr.');
            }

            await window.keplr.enable(this.chainId);
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
            return {
                accountNumber: "0",
                sequence: "0"
            };
        }
    }

    createDelegateMessage(delegatorAddress, validatorAddress, amount) {
        return {
            type: "cosmos-sdk/MsgDelegate",
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

    createUndelegateMessage(delegatorAddress, validatorAddress, amount) {
        return {
            type: "cosmos-sdk/MsgUndelegate",
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
        return {
            type: "cosmos-sdk/MsgWithdrawDelegatorReward",
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress
            }
        };
    }

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

    async signWithAmino(signerAddress, messages, fee, memo = "") {
        try {
            const accountInfo = await this.getAccountInfo(signerAddress);
            
            const signDoc = {
                chain_id: this.chainId,
                account_number: accountInfo.accountNumber,
                sequence: accountInfo.sequence,
                timeout_height: "0",
                fee: fee,
                msgs: messages,
                memo: memo
            };

            console.log('📝 Signing document:', signDoc);

            const signResponse = await window.keplr.signAmino(
                this.chainId,
                signerAddress,
                signDoc,
                {
                    preferNoSetFee: false,
                    preferNoSetMemo: false,
                    disableBalanceCheck: false
                }
            );

            console.log('✅ Amino signing successful');
            return signResponse;
        } catch (error) {
            console.error('❌ Amino signing failed:', error);
            throw error;
        }
    }

    async broadcastTransaction(signedTx) {
        try {
            const restUrl = window.MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
            
            const broadcastReq = {
                tx: signedTx.signed,
                mode: "BROADCAST_MODE_SYNC"
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

    async delegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('🥩 Starting delegation process...');
            
            const account = await this.connectKeplr();
            if (account.address !== delegatorAddress) {
                throw new Error('Connected account does not match delegator address');
            }

            const amountInUmedas = Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
            console.log(`Amount in umedas: ${amountInUmedas}`);

            const delegateMsg = this.createDelegateMessage(
                delegatorAddress,
                validatorAddress,
                amountInUmedas
            );

            const gasLimit = 300000;
            const fee = this.calculateFee(gasLimit);

            console.log('💰 Transaction fee:', fee);

            const signedTx = await this.signWithAmino(
                delegatorAddress,
                [delegateMsg],
                fee,
                `Stake ${amountInMedas} MEDAS to validator`
            );

            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('🎉 Delegation successful!');
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

            const gasLimit = 350000;
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

    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            console.log('🏆 Starting rewards claiming process...');

            const account = await this.connectKeplr();

            const withdrawMsgs = validatorAddresses.map(validatorAddress =>
                this.createWithdrawRewardsMessage(delegatorAddress, validatorAddress)
            );

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

    formatMedas(amountInUmedas) {
        return (parseInt(amountInUmedas) / Math.pow(10, this.decimals)).toFixed(6);
    }

    formatUmedas(amountInMedas) {
        return Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StakingManager;
} else {
    window.StakingManager = StakingManager;
    console.log('🥩 StakingManager loaded - Cosmos SDK 0.50.10 + Keplr compatible');
}

// ===================================
// 2. ÄNDERUNG IN ui-manager.js - Constructor
// ===================================

class UIManager {
    constructor() {
        this.activeTab = 'comm';
        this.messageHistory = new Map();
        this.contacts = new Map();
        this.validatorNameCache = new Map();
        
        // ✅ NEUE ZEILE: StakingManager hinzufügen
        this.stakingManager = new StakingManager();
        
        this.init();
    }

    // ===================================
    // 3. ÄNDERUNG IN ui-manager.js - performStaking Methode ERSETZEN
    // ===================================

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
            
            // ✅ VERWENDE DEN NEUEN STAKINGMANAGER
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

    // ===================================
    // 4. ÄNDERUNG IN ui-manager.js - claimAllRewards Methode ERSETZEN
    // ===================================

    async claimAllRewards() {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Claiming all rewards...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            const delegations = await this.fetchUserDelegations(delegatorAddress);
            
            if (!delegations || delegations.length === 0) {
                this.showNotification('❌ No delegations found', 'error');
                return;
            }
            
            const validatorAddresses = delegations.map(d => d.validator_address);
            
            // ✅ VERWENDE DEN NEUEN STAKINGMANAGER
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

    // ===================================
    // 5. ÄNDERUNG IN ui-manager.js - performUnstaking Methode ERSETZEN
    // ===================================

    async performUnstaking(validatorAddress, amount) {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Preparing undelegation...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            // ✅ VERWENDE DEN NEUEN STAKINGMANAGER
            const result = await this.stakingManager.undelegate(
                delegatorAddress,
                validatorAddress, 
                amount
            );
            
            if (result.success) {
                this.showNotification(`✅ Undelegation successful!`, 'success');
                this.showNotification('⏰ Note: Unbonding period is 21 days', 'info');
                
                if (result.txHash) {
                    this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
                }
                
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
            console.error('❌ Unstaking failed:', error);
            
            if (error.message?.includes('Request rejected') || 
                error.message?.includes('User denied')) {
                this.showNotification('❌ Unstaking cancelled by user', 'error');
            } else {
                this.showNotification(`❌ Unstaking failed: ${error.message}`, 'error');
            }
        }
    }

    // ===================================
    // 6. ALLE ALTEN CORS-FIX METHODEN LÖSCHEN
    // ===================================
    // LÖSCHEN SIE DIESE METHODEN AUS ui-manager.js:
    // - performStakingCorsFix()
    // - performClaimCorsFix()
    // - performUnstakingCorsFix()
    // - getAccountInfoViaProxy()
    // - broadcastViaProxy()
    
}

// ===================================
// 7. ÄNDERUNG IN index.html - Script Tags
// ===================================

// ✅ FÜGEN SIE DIESE ZEILE NACH keplr-manager.js HINZU:
// <script src="assets/js/staking-manager.js"></script>

// VOLLSTÄNDIGE SCRIPT-REIHENFOLGE:
// <script src="assets/js/config.js"></script>
// <script src="assets/js/mock-data.js"></script>
// <script src="assets/js/keplr-manager.js"></script>
// <script src="assets/js/staking-manager.js"></script>  <!-- NEU -->
// <script src="assets/js/ui-manager.js"></script>
// <script src="assets/js/staking-helpers.js"></script>
// <script src="assets/js/main.js"></script>
// <script src="assets/js/mobile-navigation.js"></script>

// ===================================
// 8. TESTEN & DEBUGGING
// ===================================

// Nach den Änderungen in der Browser-Konsole testen:
window.testStakingManager = async function() {
    console.log('🧪 TESTING NEW STAKING MANAGER...');
    
    try {
        // Test connection
        const stakingManager = new StakingManager();
        const account = await stakingManager.connectKeplr();
        console.log('✅ Keplr connected:', account.address);
        
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
        
        return 'NEW StakingManager test complete - all functions working!';
        
    } catch (error) {
        console.error('❌ StakingManager test failed:', error);
        return `Test failed: ${error.message}`;
    }
};
