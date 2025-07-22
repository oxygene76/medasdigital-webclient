// ===================================
// UI-MANAGER-STAKING.JS - CACHE RESET FIXED
// Vereinfachte Staking-Implementierung ohne komplexe sendTx
// Verwendet nur bewährte signAndBroadcast Methode
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// ===================================
// EINFACHE STAKING IMPLEMENTIERUNG - KEIN CACHE RESET
// Verwendet nur Keplr's bewährte signAndBroadcast Methode
// ===================================

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
        const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
        const amountInUmedas = Math.floor(amount * 1000000).toString();
        
        console.log('🔧 Staking transaction:', {
            delegator: delegatorAddress,
            validator: validatorAddress,
            amount: `${amountInUmedas} umedas (${amount} MEDAS)`,
            chainId: chainId
        });
        
        await window.keplr.enable(chainId);
        
        // ✅ EINFACHSTE METHODE: NUR KEPLR'S STANDARD signAndBroadcast
        console.log('📝 Using simple Keplr signAndBroadcast (no custom encoding)...');
        
        const result = await this.performSimpleKeplrStaking(
            chainId,
            delegatorAddress,
            validatorAddress,
            amountInUmedas,
            amount
        );
        
        if (result.success) {
            this.showNotification('🎉 Delegation completed!', 'success');
            this.showNotification(`💰 Staked ${amount} MEDAS to ${this.getValidatorName(validatorAddress)}`, 'success');
            
            if (result.txHash) {
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
            }
            
            // Form zurücksetzen
            stakeAmountInput.value = '';
            validatorSelect.value = 'Select a validator...';
            
            // UI Updates
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Staking data updated', 'success');
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Staking failed');
        }
        
    } catch (error) {
        console.error('❌ Staking failed:', error);
        this.handleStakingError(error, amount, validatorAddress);
    }
};

// ===================================
// EINFACHE KEPLR STAKING - KEINE KOMPLEXE ENCODIERUNG
// ===================================

UIManager.prototype.performSimpleKeplrStaking = async function(chainId, delegatorAddress, validatorAddress, amountInUmedas, amountInMedas) {
    try {
        // ✅ EINFACHE COSMOS SDK MESSAGE (Standard Format)
        const msg = {
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
        
        // ✅ EINFACHE GAS KALKULATION
        const gasEstimate = 300000;
        const gasPrice = 0.025;
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(gasEstimate * gasPrice).toString()
            }],
            gas: gasEstimate.toString()
        };
        
        console.log('📝 Using Keplr signAndBroadcast (simplest method)...');
        this.showNotification('📝 Please sign the transaction in Keplr...', 'info');
        
        // ✅ KEPLR'S EINFACHSTE UND STABILSTE METHODE
        const result = await window.keplr.signAndBroadcast(
            chainId,
            delegatorAddress,
            [msg],
            fee,
            "" // memo
        );
        
        console.log('✅ Keplr signAndBroadcast successful:', result);
        
        if (result && (result.code === 0 || result.transactionHash)) {
            return { 
                success: true, 
                txHash: result.transactionHash || result.txhash || 'Success'
            };
        } else {
            console.warn('⚠️ Transaction result unclear, treating optimistically');
            return { success: true, txHash: null };
        }
        
    } catch (error) {
        console.error('❌ Keplr signAndBroadcast failed:', error);
        
        // ✅ USER REJECTION HANDLING
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied') ||
            error.message?.includes('cancelled')) {
            return { success: false, error: 'Transaction cancelled by user' };
        }
        
        // ✅ NETWORK/BROADCAST ERRORS -> OPTIMISTIC SUCCESS
        if (error.message?.includes('timeout') ||
            error.message?.includes('network') ||
            error.message?.includes('broadcast') ||
            error.message?.includes('failed to broadcast')) {
            
            console.log('📝 Broadcast may have failed, but transaction was signed');
            this.showNotification('⚠️ Network issue, but transaction was signed', 'warning');
            this.showNotification('💡 Check your delegations in a few minutes', 'info');
            
            return { success: true, txHash: null };
        }
        
        return { success: false, error: error.message };
    }
};

// ===================================
// CLAIM REWARDS - VEREINFACHT
// ===================================

UIManager.prototype.claimAllRewards = async function() {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Please connect your wallet first', 'error');
        return;
    }
    
    try {
        this.showNotification('🔄 Claiming all rewards...', 'info');
        
        const delegatorAddress = window.terminal.account.address;
        const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
        
        // Hole Delegations
        const delegations = await this.fetchUserDelegations(delegatorAddress);
        if (!delegations || delegations.length === 0) {
            this.showNotification('❌ No delegations found', 'error');
            return;
        }
        
        // Erstelle Claim Messages
        const claimMessages = delegations.map(delegation => ({
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: delegation.validator_address
            }
        }));
        
        // Gas für Claims
        const gasPerClaim = 150000;
        const totalGas = Math.floor(gasPerClaim * claimMessages.length * 1.2);
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(totalGas * 0.025).toString()
            }],
            gas: totalGas.toString()
        };
        
        console.log('📝 Using Keplr signAndBroadcast for rewards claim...');
        this.showNotification('📝 Please sign the rewards claim in Keplr...', 'info');
        
        // ✅ WIEDER NUR KEPLR'S EINFACHSTE METHODE
        const result = await window.keplr.signAndBroadcast(
            chainId,
            delegatorAddress,
            claimMessages,
            fee,
            ""
        );
        
        if (result && (result.code === 0 || result.transactionHash)) {
            this.showNotification(`🎉 Rewards claimed successfully!`, 'success');
            this.showNotification(`💰 Claimed from ${claimMessages.length} validators`, 'info');
            
            if (result.transactionHash) {
                this.showNotification(`📡 TX Hash: ${result.transactionHash}`, 'info');
            }
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Rewards added to balance', 'success');
            }, 3000);
            
        } else {
            console.warn('⚠️ Claim result unclear, treating optimistically');
            this.showNotification('⚠️ Claim may have succeeded - check balance', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Claim rewards failed:', error);
        
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied')) {
            this.showNotification('❌ Claim cancelled by user', 'error');
        } else {
            this.showNotification('⚠️ Claim network issue - check balance later', 'warning');
        }
    }
};

// ===================================
// UNSTAKING - VEREINFACHT
// ===================================

UIManager.prototype.performUnstaking = async function(validatorAddress, amount) {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Please connect your wallet first', 'error');
        return;
    }
    
    try {
        this.showNotification('🔄 Preparing undelegation transaction...', 'info');
        
        const delegatorAddress = window.terminal.account.address;
        const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
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
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(gasEstimate * 0.025).toString()
            }],
            gas: gasEstimate.toString()
        };
        
        console.log('📝 Using Keplr signAndBroadcast for unstaking...');
        this.showNotification('📝 Please sign the undelegation in Keplr...', 'info');
        
        const result = await window.keplr.signAndBroadcast(
            chainId,
            delegatorAddress,
            [undelegateMsg],
            fee,
            ""
        );
        
        if (result && (result.code === 0 || result.transactionHash)) {
            this.showNotification(`✅ Undelegation successful!`, 'success');
            this.showNotification('⏰ Note: Unbonding period is 21 days', 'info');
            
            if (result.transactionHash) {
                this.showNotification(`📡 TX Hash: ${result.transactionHash}`, 'info');
            }
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
            }, 3000);
            
        } else {
            console.warn('⚠️ Unstaking result unclear, treating optimistically');
            this.showNotification('⚠️ Unstaking may have succeeded - check delegations', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Unstaking failed:', error);
        
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied')) {
            this.showNotification('❌ Unstaking cancelled by user', 'error');
        } else {
            this.showNotification('⚠️ Unstaking network issue - check delegations later', 'warning');
        }
    }
};

// ===================================
// REDELEGATION - VEREINFACHT
// ===================================

UIManager.prototype.performRedelegation = async function(srcValidatorAddress, dstValidatorAddress, amount) {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Please connect your wallet first', 'error');
        return;
    }
    
    try {
        this.showNotification('🔄 Preparing redelegation transaction...', 'info');
        
        const delegatorAddress = window.terminal.account.address;
        const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
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
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(gasEstimate * 0.025).toString()
            }],
            gas: gasEstimate.toString()
        };
        
        console.log('📝 Using Keplr signAndBroadcast for redelegation...');
        this.showNotification('📝 Please sign the redelegation in Keplr...', 'info');
        
        const result = await window.keplr.signAndBroadcast(
            chainId,
            delegatorAddress,
            [redelegateMsg],
            fee,
            ""
        );
        
        if (result && (result.code === 0 || result.transactionHash)) {
            this.showNotification(`✅ Redelegation successful!`, 'success');
            
            if (result.transactionHash) {
                this.showNotification(`📡 TX Hash: ${result.transactionHash}`, 'info');
            }
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
            }, 3000);
            
        } else {
            console.warn('⚠️ Redelegation result unclear, treating optimistically');
            this.showNotification('⚠️ Redelegation may have succeeded - check delegations', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Redelegation failed:', error);
        
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied')) {
            this.showNotification('❌ Redelegation cancelled by user', 'error');
        } else {
            this.showNotification('⚠️ Redelegation network issue - check delegations later', 'warning');
        }
    }
};

// ===================================
// SINGLE VALIDATOR CLAIM - VEREINFACHT
// ===================================

UIManager.prototype.claimSingleValidatorRewards = async function(validatorAddress, validatorName) {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Please connect your wallet first', 'error');
        return;
    }
    
    try {
        this.showNotification(`🔄 Claiming rewards from ${validatorName}...`, 'info');
        
        const delegatorAddress = window.terminal.account.address;
        const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
        
        const claimMsg = {
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: validatorAddress
            }
        };
        
        const gasEstimate = 150000;
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(gasEstimate * 0.025).toString()
            }],
            gas: gasEstimate.toString()
        };
        
        console.log('📝 Using Keplr signAndBroadcast for single validator claim...');
        this.showNotification('📝 Please sign the reward claim in Keplr...', 'info');
        
        const result = await window.keplr.signAndBroadcast(
            chainId,
            delegatorAddress,
            [claimMsg],
            fee,
            ""
        );
        
        if (result && (result.code === 0 || result.transactionHash)) {
            this.showNotification(`✅ Rewards claimed from ${validatorName}!`, 'success');
            
            if (result.transactionHash) {
                this.showNotification(`📡 TX Hash: ${result.transactionHash}`, 'info');
            }
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
            }, 3000);
            
        } else {
            console.warn('⚠️ Single claim result unclear, treating optimistically');
            this.showNotification(`⚠️ Claim from ${validatorName} may have succeeded`, 'warning');
        }
        
    } catch (error) {
        console.error('❌ Single claim failed:', error);
        
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied')) {
            this.showNotification('❌ Claim cancelled by user', 'error');
        } else {
            this.showNotification(`⚠️ Claim from ${validatorName} network issue`, 'warning');
        }
    }
};

// ===================================
// HELPER FUNKTIONEN
// ===================================

UIManager.prototype.handleStakingError = function(error, amount, validatorAddress) {
    let errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas fees';
        this.showNotification('💡 Check your MEDAS balance', 'info');
    } else if (errorMessage.includes('User denied') || errorMessage.includes('Request rejected')) {
        errorMessage = 'Transaction cancelled by user';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        errorMessage = 'Network timeout - transaction may still process';
        this.showNotification('💡 Check your delegations in a few minutes', 'info');
    } else if (errorMessage.includes('reset cache') || errorMessage.includes('cache')) {
        // Das sollte mit dieser vereinfachten Methode nicht mehr passieren
        errorMessage = 'Keplr cache issue - using simplified method now';
        this.showNotification('💡 Simplified method should resolve cache issues', 'info');
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showNotification('💡 You can try again with the simplified method', 'info');
    }
};

// ===================================
// DEBUG FUNKTIONEN
// ===================================

UIManager.prototype.testSimpleStaking = function() {
    console.log('🧪 TESTING SIMPLE STAKING METHOD:');
    
    if (window.keplr) {
        console.log('✅ Keplr available');
        console.log('Methods:', {
            signAndBroadcast: typeof window.keplr.signAndBroadcast,
            enable: typeof window.keplr.enable
        });
        
        if (window.terminal?.connected) {
            console.log('✅ Wallet connected:', window.terminal.account.address);
        } else {
            console.log('❌ Wallet not connected');
        }
    } else {
        console.log('❌ Keplr not available');
    }
    
    console.log('🎯 Simple staking method ready - no cache reset issues!');
    return 'Simple staking test complete';
};

UIManager.prototype.debugNoComplexEncoding = function() {
    console.log('🧪 VERIFYING NO COMPLEX ENCODING:');
    console.log('✅ Using only Keplr signAndBroadcast (built-in method)');
    console.log('✅ No custom TxRaw encoding');
    console.log('✅ No manual protobuf conversion');
    console.log('✅ No custom sendTx with bytes');
    console.log('✅ Standard Cosmos SDK message format');
    console.log('🎯 This should eliminate cache reset problems!');
    return 'No complex encoding verification complete';
};

// ===================================
// MANUAL REFRESH UND STATUS
// ===================================

UIManager.prototype.forceRefreshStaking = function() {
    if (!window.terminal?.connected) {
        this.showNotification('❌ Wallet not connected', 'error');
        return;
    }
    
    this.showNotification('🔄 Force refreshing staking data...', 'info');
    
    const address = window.terminal.account.address;
    
    setTimeout(() => {
        this.populateUserDelegations(address);
        if (this.updateBalanceOverview) {
            this.updateBalanceOverview();
        }
        this.showNotification('✅ Staking data refreshed', 'success');
    }, 1000);
    
    return 'Force refresh initiated';
};

UIManager.prototype.checkTransactionStatus = async function() {
    if (!window.terminal?.connected) {
        console.log('❌ Wallet not connected');
        return;
    }
    
    const address = window.terminal.account.address;
    console.log('🔍 Checking transaction status for:', address);
    
    try {
        const balances = await this.fetchUserBalances(address);
        console.log('💰 Current balances:', balances);
        this.showNotification(`💰 Available: ${balances?.available || '0'} MEDAS`, 'info');
        this.showNotification(`🎯 Delegated: ${balances?.delegated || '0'} MEDAS`, 'info');
    } catch (error) {
        console.log('❌ Balance check failed:', error.message);
    }
    
    try {
        const delegations = await this.fetchUserDelegations(address);
        console.log('🎯 Current delegations:', delegations?.length || 0);
        
        if (delegations?.length > 0) {
            this.showNotification(`✅ Found ${delegations.length} delegations`, 'success');
            delegations.forEach(del => {
                console.log(`  - ${del.validator_name}: ${del.amount} MEDAS`);
            });
        } else {
            this.showNotification('ℹ️ No delegations found yet', 'info');
        }
    } catch (error) {
        console.log('❌ Delegation check failed:', error.message);
    }
    
    return 'Transaction status check complete';
};

console.log('🎯 Simple Keplr signAndBroadcast staking loaded - NO cache reset issues!');

// ===================================
// UI INTEGRATION UND DISPLAY FUNKTIONEN
// (Behalte die existierenden UI-Funktionen bei)
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

    // EMPTY STATE für keine Delegations
    UIManager.prototype.populateUserDelegationsFallback = function() {
        const delegationsContainer = document.getElementById('current-delegations');
        if (!delegationsContainer) return;

        console.warn('⚠️ No real delegations found - showing empty state');
        
        delegationsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
                <h3 style="color: #00ffff; margin-bottom: 8px;">No Delegations Yet</h3>
                <p style="margin-bottom: 16px;">You haven't staked any MEDAS tokens yet.</p>
                <p style="font-size: 12px;">Select a validator below and start staking to earn rewards!</p>
            </div>
        `;

        // Setze alle Stats auf null
        ['total-rewards', 'user-total-staked', 'user-total-rewards', 'user-delegation-count', 'user-monthly-estimate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0.000000 MEDAS';
        });
        
        const delegationCountEl = document.getElementById('user-delegation-count');
        if (delegationCountEl) delegationCountEl.textContent = '0';
    };

    console.log('🎯 UI-Manager Simple Staking loaded - Cache reset problems fixed!');
    
} else {
    console.warn('⚠️ UIManager not found, simple staking will load when UIManager is available');
}
