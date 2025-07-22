// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
    // ===================================
    // ECHTE STAKING-TRANSAKTIONEN
    // ===================================

    // DELEGATE TOKENS (Staking)
    UIManager.prototype.performStaking = async function() {
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
            this.showNotification('🔄 Preparing delegation transaction...', 'info');
            
            const validatorAddress = validatorSelect.value;
            const delegatorAddress = window.terminal.account.address;
            
            // Konvertiere MEDAS zu umedas (6 Dezimalstellen)
            const amountInUmedas = Math.floor(amount * 1000000).toString();
            
            // Erstelle Delegation Message
            const delegateMsg = {
                typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
                value: {
                    delegatorAddress: delegatorAddress,
                    validatorAddress: validatorAddress,
                    amount: {
                        denom: 'umedas',
                        amount: amountInUmedas
                    }
                }
            };
            
            // Gas-Schätzung
            const gasEstimate = 250000;
            
            // Verwende Keplr für Transaction
            const result = await window.keplr.sendTx(
                MEDAS_CHAIN_CONFIG.chainId,
                [{
                    ...delegateMsg,
                    gas: gasEstimate.toString(),
                    fee: {
                        amount: [{
                            denom: 'umedas',
                            amount: Math.floor(gasEstimate * 0.025).toString()
                        }],
                        gas: gasEstimate.toString()
                    }
                }]
            );
            
            if (result && result.code === 0) {
                this.showNotification(`✅ Delegation successful! TX: ${result.transactionHash}`, 'success');
                
                // Aktualisiere UI
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    this.updateBalanceOverview();
                }, 3000);
                
                // Reset Form via StakingHelpers
                if (window.stakingHelpers) {
                    window.stakingHelpers.resetStakingForm();
                }
                
            } else {
                throw new Error(result?.log || 'Transaction failed');
            }
            
        } catch (error) {
            console.error('❌ Staking failed:', error);
            this.showNotification(`❌ Staking failed: ${error.message}`, 'error');
        }
    };

    // CLAIM ALL REWARDS
    UIManager.prototype.claimAllRewards = async function() {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Claiming all rewards...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            // Hole aktuelle Delegations
            const delegations = await this.fetchUserDelegations(delegatorAddress);
            if (!delegations || delegations.length === 0) {
                this.showNotification('❌ No delegations found', 'error');
                return;
            }
            
            // Erstelle Claim-Messages für alle Validators
            const claimMessages = delegations.map(delegation => ({
                typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                value: {
                    delegatorAddress: delegatorAddress,
                    validatorAddress: delegation.validator_address
                }
            }));
            
            if (claimMessages.length === 0) {
                this.showNotification('❌ No rewards to claim', 'error');
                return;
            }
            
            const gasPerClaim = 150000;
            const totalGas = gasPerClaim * claimMessages.length;
            
            const result = await window.keplr.sendTx(
                MEDAS_CHAIN_CONFIG.chainId,
                claimMessages.map(msg => ({
                    ...msg,
                    gas: totalGas.toString(),
                    fee: {
                        amount: [{
                            denom: 'umedas',
                            amount: Math.floor(totalGas * 0.025).toString()
                        }],
                        gas: totalGas.toString()
                    }
                }))
            );
            
            if (result && result.code === 0) {
                this.showNotification(`✅ Rewards claimed successfully! TX: ${result.transactionHash}`, 'success');
                
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    this.updateBalanceOverview();
                }, 3000);
                
            } else {
                throw new Error(result?.log || 'Transaction failed');
            }
            
        } catch (error) {
            console.error('❌ Claim rewards failed:', error);
            this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        }
    };

    // UNDELEGATE TOKENS (Unstaking)
    UIManager.prototype.performUnstaking = async function(validatorAddress, amount) {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Preparing undelegation transaction...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            const amountInUmedas = Math.floor(parseFloat(amount) * 1000000).toString();
            
            const undelegateMsg = {
                typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
                value: {
                    delegatorAddress: delegatorAddress,
                    validatorAddress: validatorAddress,
                    amount: {
                        denom: 'umedas',
                        amount: amountInUmedas
                    }
                }
            };
            
            const gasEstimate = 300000;
            
            const result = await window.keplr.sendTx(
                MEDAS_CHAIN_CONFIG.chainId,
                [{
                    ...undelegateMsg,
                    gas: gasEstimate.toString(),
                    fee: {
                        amount: [{
                            denom: 'umedas',
                            amount: Math.floor(gasEstimate * 0.025).toString()
                        }],
                        gas: gasEstimate.toString()
                    }
                }]
            );
            
            if (result && result.code === 0) {
                this.showNotification(`✅ Undelegation successful! TX: ${result.transactionHash}`, 'success');
                this.showNotification('⏰ Note: Unbonding period is 21 days', 'info');
                
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    this.updateBalanceOverview();
                }, 3000);
                
            } else {
                throw new Error(result?.log || 'Transaction failed');
            }
            
        } catch (error) {
            console.error('❌ Unstaking failed:', error);
            this.showNotification(`❌ Unstaking failed: ${error.message}`, 'error');
        }
    };

    // REDELEGATE TOKENS
    UIManager.prototype.performRedelegation = async function(srcValidatorAddress, dstValidatorAddress, amount) {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Preparing redelegation transaction...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            const amountInUmedas = Math.floor(parseFloat(amount) * 1000000).toString();
            
            const redelegateMsg = {
                typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
                value: {
                    delegatorAddress: delegatorAddress,
                    validatorSrcAddress: srcValidatorAddress,
                    validatorDstAddress: dstValidatorAddress,
                    amount: {
                        denom: 'umedas',
                        amount: amountInUmedas
                    }
                }
            };
            
            const gasEstimate = 350000;
            
            const result = await window.keplr.sendTx(
                MEDAS_CHAIN_CONFIG.chainId,
                [{
                    ...redelegateMsg,
                    gas: gasEstimate.toString(),
                    fee: {
                        amount: [{
                            denom: 'umedas',
                            amount: Math.floor(gasEstimate * 0.025).toString()
                        }],
                        gas: gasEstimate.toString()
                    }
                }]
            );
            
            if (result && result.code === 0) {
                this.showNotification(`✅ Redelegation successful! TX: ${result.transactionHash}`, 'success');
                
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    this.updateBalanceOverview();
                }, 3000);
                
            } else {
                throw new Error(result?.log || 'Transaction failed');
            }
            
        } catch (error) {
            console.error('❌ Redelegation failed:', error);
            this.showNotification(`❌ Redelegation failed: ${error.message}`, 'error');
        }
    };

    // CLAIM SINGLE VALIDATOR REWARDS
    UIManager.prototype.claimSingleValidatorRewards = async function(validatorAddress, validatorName) {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification(`🔄 Claiming rewards from ${validatorName}...`, 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            const claimMsg = {
                typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                value: {
                    delegatorAddress: delegatorAddress,
                    validatorAddress: validatorAddress
                }
            };
            
            const gasEstimate = 150000;
            
            const result = await window.keplr.sendTx(
                MEDAS_CHAIN_CONFIG.chainId,
                [{
                    ...claimMsg,
                    gas: gasEstimate.toString(),
                    fee: {
                        amount: [{
                            denom: 'umedas',
                            amount: Math.floor(gasEstimate * 0.025).toString()
                        }],
                        gas: gasEstimate.toString()
                    }
                }]
            );
            
            if (result && result.code === 0) {
                this.showNotification(`✅ Rewards claimed from ${validatorName}! TX: ${result.transactionHash}`, 'success');
                
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    this.updateBalanceOverview();
                }, 3000);
                
            } else {
                throw new Error(result?.log || 'Transaction failed');
            }
            
        } catch (error) {
            console.error('❌ Claim rewards failed:', error);
            this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        }
    };

    // ===================================
    // ERWEITERTE UI-UPDATES
    // ===================================

    // DISPLAY USER DELEGATIONS (Enhanced)
    UIManager.prototype.displayUserDelegations = function(delegations) {
        const delegationsContainer = document.getElementById('current-delegations');
        if (!delegationsContainer) return;

        let totalRewards = 0;
        
        delegationsContainer.innerHTML = delegations.map(delegation => {
            const rewards = parseFloat(delegation.rewards || '0');
            totalRewards += rewards;
            
            return `
                <div class="delegation-item">
                    <div class="validator-info">
                        <div class="validator-name">${delegation.validator_name}</div>
                        <div class="validator-details">
                            Delegated: ${delegation.amount} MEDAS | 
                            Rewards: +${delegation.rewards} MEDAS
                        </div>
                        <div class="validator-address" style="font-size: 10px; color: #666; margin-top: 4px;">
                            ${delegation.validator_address}
                        </div>
                    </div>
                    <div class="stake-actions">
                        <button class="btn-small btn-warning" style="margin-right: 8px;" 
                                onclick="claimRewards('${delegation.validator_address}', '${delegation.validator_name}')">
                            Claim
                        </button>
                        <button class="btn-small btn-primary" style="margin-right: 8px;" 
                                onclick="addMoreStake('${delegation.validator_address}', '${delegation.validator_name}')">
                            Add More
                        </button>
                        <button class="btn-small btn-danger" 
                                onclick="unstakeFrom('${delegation.validator_address}', '${delegation.validator_name}', '${delegation.amount}')">
                            Unstake
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update total rewards display
        const totalRewardsEl = document.getElementById('total-rewards');
        if (totalRewardsEl) {
            totalRewardsEl.textContent = `${totalRewards.toFixed(6)} MEDAS`;
        }
    };

    // UPDATE DELEGATION SELECTS
    UIManager.prototype.updateDelegationSelects = function(delegations) {
        // Update Redelegate From Select
        const redelegateFromSelect = document.getElementById('redelegate-from-select');
        if (redelegateFromSelect) {
            redelegateFromSelect.innerHTML = '<option>Select source validator...</option>' +
                delegations.map(delegation => 
                    `<option value="${delegation.validator_address}">${delegation.validator_name} (${delegation.amount} MEDAS)</option>`
                ).join('');
        }
        
        // Update Undelegate From Select
        const undelegateFromSelect = document.getElementById('undelegate-from-select');
        if (undelegateFromSelect) {
            undelegateFromSelect.innerHTML = '<option>Select validator to unstake from...</option>' +
                delegations.map(delegation => 
                    `<option value="${delegation.validator_address}">${delegation.validator_name} (${delegation.amount} MEDAS)</option>`
                ).join('');
        }
    };

    // UPDATE STAKING STATISTICS
    UIManager.prototype.updateStakingStatistics = function(delegations) {
        let totalStaked = 0;
        let totalRewards = 0;
        
        delegations.forEach(delegation => {
            totalStaked += parseFloat(delegation.amount || '0');
            totalRewards += parseFloat(delegation.rewards || '0');
        });
        
        // Update UI elements
        const totalStakedEl = document.getElementById('user-total-staked');
        if (totalStakedEl) {
            totalStakedEl.textContent = `${totalStaked.toFixed(6)} MEDAS`;
        }
        
        const totalRewardsEl = document.getElementById('user-total-rewards');
        if (totalRewardsEl) {
            totalRewardsEl.textContent = `${totalRewards.toFixed(6)} MEDAS`;
        }
        
        const delegationCountEl = document.getElementById('user-delegation-count');
        if (delegationCountEl) {
            delegationCountEl.textContent = delegations.length.toString();
        }
        
        // Geschätzte monatliche Rewards (angenommen 12% APY)
        const monthlyEstimate = totalStaked * 0.12 / 12;
        const monthlyEstimateEl = document.getElementById('user-monthly-estimate');
        if (monthlyEstimateEl) {
            monthlyEstimateEl.textContent = `${monthlyEstimate.toFixed(6)} MEDAS`;
        }
    };

    // POPULATE VALIDATORS WITH ACTIONS
    UIManager.prototype.populateValidatorsWithActions = function(validators) {
        const validatorsContainer = document.getElementById('validators-list');
        if (!validatorsContainer) return;

        validatorsContainer.innerHTML = validators.map(validator => {
            const commission = parseFloat(validator.commission?.commission_rates?.rate || 0) * 100;
            const votingPower = this.formatTokenAmount(validator.tokens, 6);
            const status = validator.status === 'BOND_STATUS_BONDED' ? 'Active' : 'Inactive';
            const jailed = validator.jailed ? 'Jailed' : 'OK';
            
            return `
                <div class="delegation-item">
                    <div class="validator-info">
                        <div class="validator-name">${this.getValidatorName(validator.operator_address)}</div>
                        <div class="validator-details">
                            Commission: ${commission.toFixed(2)}% | 
                            Voting Power: ${votingPower} MEDAS | 
                            Status: ${status} ${jailed !== 'OK' ? '(' + jailed + ')' : ''}
                        </div>
                        <div class="validator-address" style="font-size: 10px; color: #666; margin-top: 4px;">
                            ${validator.operator_address}
                        </div>
                    </div>
                    <div class="stake-actions">
                        <button class="btn-small btn-primary" style="border-color: #00ffff; color: #00ffff; margin-right: 8px;" 
                                onclick="selectValidator('${validator.operator_address}', '${this.getValidatorName(validator.operator_address)}')">
                            Select
                        </button>
                        <button class="btn-small btn-success" style="border-color: #00ff00; color: #00ff00;" 
                                onclick="quickStake('${validator.operator_address}', '${this.getValidatorName(validator.operator_address)}')">
                            Quick Stake
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    };

    console.log('🎯 UI-Manager Staking extensions loaded');
    
} else {
    console.warn('⚠️ UIManager not found, staking extensions will load when UIManager is available');
}
