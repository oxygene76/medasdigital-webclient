// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// ===================================
// MODERNE PROTOBUF STAKING - COSMOS SDK 0.50.10
// Nur die benötigten Funktionen, sauber strukturiert
// ===================================

// MAIN STAKING FUNCTION - MODERNE PROTOBUF API
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
        
        console.log('🔧 Transaction details:', {
            delegator: delegatorAddress,
            validator: validatorAddress,
            amount: `${amountInUmedas} umedas (${amount} MEDAS)`,
            chainId: chainId
        });
        
        await window.keplr.enable(chainId);
        
        // ✅ PROTOBUF STAKING MIT EXPERIMENTALSIGNTX
        if (window.keplr.experimentalSignTx) {
            try {
                console.log('📝 Using Protobuf experimentalSignTx...');
                
                const msgs = [{
                    typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                    value: {
                        delegatorAddress: delegatorAddress,
                        validatorAddress: validatorAddress,
                        amount: {
                            denom: "umedas",
                            amount: amountInUmedas
                        }
                    }
                }];
                
                const fee = {
                    amount: [{
                        denom: "umedas", 
                        amount: "6250"
                    }],
                    gas: "250000"
                };
                
                const result = await window.keplr.experimentalSignTx(
                    chainId,
                    delegatorAddress,
                    msgs,
                    fee,
                    "", // memo
                    {
                        preferNoSetFee: false,
                        preferNoSetMemo: true,
                        disableBalanceCheck: false
                    }
                );
                
                console.log('✅ Protobuf transaction successful:', result);
                
                const txHash = result.txHash || result.transactionHash || result;
                this.showNotification(`✅ Delegation successful! TX: ${txHash}`, 'success');
                
                // UI Update nach Erfolg
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
                
            } catch (protobufError) {
                console.warn('❌ Protobuf method failed:', protobufError);
            }
        }
        
        // ✅ FALLBACK: KEPLR DASHBOARD
        console.log('📱 Fallback: Redirecting to Keplr Dashboard...');
        this.handleKeplrDashboardFallback(validatorAddress, amount, delegatorAddress, stakeAmountInput, validatorSelect);
        
    } catch (error) {
        console.error('❌ Staking failed:', error);
        this.handleStakingError(error, amount, validatorAddress, validatorSelect);
    }
};

// ✅ ERFOLGREICHE TRANSAKTION BEHANDELN
UIManager.prototype.handleStakingSuccess = function(delegatorAddress, stakeAmountInput, validatorSelect) {
    // UI nach 6 Sekunden aktualisieren (Cosmos SDK 0.50 braucht etwas länger)
    setTimeout(() => {
        this.populateUserDelegations(delegatorAddress);
        if (this.updateBalanceOverview) {
            this.updateBalanceOverview();
        }
    }, 6000);
    
    // Form zurücksetzen
    stakeAmountInput.value = '';
    validatorSelect.value = 'Select a validator...';
};

// ✅ KEPLR DASHBOARD FALLBACK
UIManager.prototype.handleKeplrDashboardFallback = function(validatorAddress, amount, delegatorAddress, stakeAmountInput, validatorSelect) {
    this.showNotification('🔄 Redirecting to Keplr Dashboard for staking...', 'info');
    
    // Erstelle optimierte Keplr Dashboard URL
    const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
    const keplrUrl = `https://wallet.keplr.app/chains/${chainId}/stake`;
    
    // Öffne Keplr Dashboard
    window.open(keplrUrl, '_blank');
    
    // Zeige hilfreiche Anweisungen
    this.showNotification(`🎯 Delegate ${amount} MEDAS to validator`, 'info');
    this.showNotification(`🔗 Validator: ${validatorAddress.slice(-8)}`, 'info');
    this.showNotification('📱 Complete transaction in Keplr Dashboard', 'info');
    
    // Reset Form
    stakeAmountInput.value = '';
    validatorSelect.value = 'Select a validator...';
    
    // Starte Balance Monitoring
    this.startBalanceMonitoring(delegatorAddress);
};

// ✅ FEHLERBEHANDLUNG
UIManager.prototype.handleStakingError = function(error, amount, validatorAddress, validatorSelect) {
    let errorMessage = error.message;
    
    if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas fees';
    } else if (errorMessage.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user';
    } else if (errorMessage.includes('Request rejected')) {
        errorMessage = 'Transaction rejected - please try again';
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    // Bei echten Fehlern (nicht User-Cancellation): Zeige Fallback
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showStakingFallbackInstructions(amount, validatorAddress, validatorSelect);
    }
};

// ✅ BALANCE MONITORING (ERKENNT ERFOLGREICHE DELEGATIONEN)
UIManager.prototype.startBalanceMonitoring = function(delegatorAddress) {
    let checkCount = 0;
    const maxChecks = 24; // 2 Minuten bei 5-Sekunden-Intervallen
    
    this.showNotification('🔍 Monitoring for balance changes...', 'info');
    
    const checkInterval = setInterval(async () => {
        checkCount++;
        
        try {
            const newBalances = await this.fetchUserBalances(delegatorAddress);
            const currentDelegated = parseFloat(newBalances?.delegated || '0');
            
            // Erfolg erkennen: Delegation > 0
            if (currentDelegated > 0) {
                clearInterval(checkInterval);
                
                this.showNotification('✅ Delegation detected! Updating UI...', 'success');
                
                // UI komplett aktualisieren
                await this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    await this.updateBalanceOverview();
                }
                
                this.showNotification('🎉 Staking completed successfully!', 'success');
                return;
            }
            
            // Timeout nach maxChecks
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                this.showNotification('⏰ Monitoring timeout - please refresh manually', 'warning');
            }
            
        } catch (error) {
            console.log('Balance check failed:', error);
        }
    }, 5000);
};

// ✅ FALLBACK ANWEISUNGEN
UIManager.prototype.showStakingFallbackInstructions = function(amount, validatorAddress, validatorSelect) {
    const validatorName = validatorSelect.options[validatorSelect.selectedIndex]?.text || `Validator ${validatorAddress.slice(-8)}`;
    
    this.showNotification('💡 Please complete staking manually:', 'info');
    this.showNotification('📱 Steps:', 'info');
    this.showNotification('1. Open Keplr extension', 'info');
    this.showNotification('2. Go to Stake tab', 'info');
    this.showNotification('3. Select MedasDigital chain', 'info');
    this.showNotification(`4. Find validator: ${validatorName}`, 'info');
    this.showNotification(`5. Delegate ${amount} MEDAS`, 'info');
    
    // Form zurücksetzen
    const stakeAmountInput = document.getElementById('stake-amount');
    if (stakeAmountInput) stakeAmountInput.value = '';
    if (validatorSelect) validatorSelect.value = 'Select a validator...';
};

// ✅ EINFACHE ALTERNATIVE: DIREKT ZU KEPLR DASHBOARD
UIManager.prototype.performStakingDirect = async function() {
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    const amount = parseFloat(stakeAmountInput?.value || '0');
    const validatorAddress = validatorSelect?.value;
    
    if (!validatorAddress || validatorAddress === 'Select a validator...' || amount <= 0) {
        this.showNotification('❌ Please select validator and enter amount', 'error');
        return;
    }
    
    const delegatorAddress = window.terminal?.account?.address;
    if (!delegatorAddress) {
        this.showNotification('❌ Please connect your wallet first', 'error');
        return;
    }
    
    this.showNotification('🚀 Opening Keplr Dashboard for staking...', 'success');
    this.handleKeplrDashboardFallback(validatorAddress, amount, delegatorAddress, stakeAmountInput, validatorSelect);
};

// ✅ STATUS CHECK FUNKTION
UIManager.prototype.checkStakingStatus = async function() {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Wallet not connected', 'error');
        return;
    }
    
    this.showNotification('🔍 Checking current staking status...', 'info');
    
    try {
        await this.populateUserDelegations(window.terminal.account.address);
        if (this.updateBalanceOverview) {
            await this.updateBalanceOverview();
        }
        this.showNotification('✅ Staking status updated', 'success');
    } catch (error) {
        this.showNotification('❌ Failed to check staking status', 'error');
    }
};

// ===================================
// ZUSÄTZLICHE STAKING-OPERATIONEN
// ===================================

// ✅ CLAIM ALL REWARDS (PROTOBUF)
UIManager.prototype.claimAllRewards = async function() {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Please connect your wallet first', 'error');
        return;
    }
    
    try {
        this.showNotification('🔄 Claiming all rewards...', 'info');
        
        const delegatorAddress = window.terminal.account.address;
        const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
        
        // Hole aktuelle Delegations
        const delegations = await this.fetchUserDelegations(delegatorAddress);
        if (!delegations || delegations.length === 0) {
            this.showNotification('❌ No delegations found', 'error');
            return;
        }
        
        // Erstelle Claim Messages für alle Validators
        const claimMessages = delegations.map(delegation => ({
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: delegatorAddress,
                validatorAddress: delegation.validator_address
            }
        }));
        
        const totalGas = 150000 * claimMessages.length;
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(totalGas * 0.025).toString()
            }],
            gas: totalGas.toString()
        };
        
        if (window.keplr.experimentalSignTx) {
            const result = await window.keplr.experimentalSignTx(
                chainId,
                delegatorAddress,
                claimMessages,
                fee,
                ""
            );
            
            this.showNotification(`✅ Rewards claimed successfully! TX: ${result}`, 'success');
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
            }, 6000);
        } else {
            throw new Error('Modern Keplr API not available');
        }
        
    } catch (error) {
        console.error('❌ Claim rewards failed:', error);
        this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        this.showNotification('💡 Try claiming in Keplr Dashboard', 'info');
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

 // OVERRIDE: populateUserDelegations - BESSERE FEHLERBEHANDLUNG
    UIManager.prototype.populateUserDelegations = async function(delegatorAddress) {
        console.log('🔍 Loading user delegations for:', delegatorAddress);
        
        try {
            const delegationsSection = document.getElementById('my-delegations-section');
            if (delegationsSection) {
                delegationsSection.style.display = 'block';
            }
            
            const delegations = await this.fetchUserDelegations(delegatorAddress);
            
            // ERFOLG: Echte Delegations gefunden
            if (delegations && delegations.length > 0) {
                console.log('✅ Found real delegations:', delegations.length);
                this.displayUserDelegations(delegations);
                this.updateDelegationSelects(delegations);
                this.updateStakingStatistics(delegations);
                return;
            }
            
            // ERFOLG: Keine Delegations (leerer Wallet)
            console.log('ℹ️ No delegations found - wallet has no stakes yet');
            this.populateUserDelegationsFallback();
            
        } catch (error) {
            console.error('❌ Failed to load user delegations:', error);
            // NUR BEI ECHTEN FEHLERN -> Fallback
            this.populateUserDelegationsFallback();
        }
    };

    // OVERRIDE: populateUserDelegationsFallback - EMPTY STATE statt Mock Data
    UIManager.prototype.populateUserDelegationsFallback = function() {
        const delegationsContainer = document.getElementById('current-delegations');
        if (!delegationsContainer) return;

        console.warn('⚠️ No real delegations found - showing empty state instead of mock data');
        
        // ANSTATT MOCK DATEN -> ZEIGE EMPTY STATE
        delegationsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
                <h3 style="color: #00ffff; margin-bottom: 8px;">No Delegations Yet</h3>
                <p style="margin-bottom: 16px;">You haven't staked any MEDAS tokens yet.</p>
                <p style="font-size: 12px;">Select a validator below and start staking to earn rewards!</p>
            </div>
        `;

        // SETZE ALLE STATS AUF NULL
        const totalRewardsEl = document.getElementById('total-rewards');
        if (totalRewardsEl) totalRewardsEl.textContent = '0.000000 MEDAS';
        
        const totalStakedEl = document.getElementById('user-total-staked');
        if (totalStakedEl) totalStakedEl.textContent = '0.000000 MEDAS';
        
        const totalRewardsStatsEl = document.getElementById('user-total-rewards');
        if (totalRewardsStatsEl) totalRewardsStatsEl.textContent = '0.000000 MEDAS';
        
        const delegationCountEl = document.getElementById('user-delegation-count');
        if (delegationCountEl) delegationCountEl.textContent = '0';
        
        const monthlyEstimateEl = document.getElementById('user-monthly-estimate');
        if (monthlyEstimateEl) monthlyEstimateEl.textContent = '0.000000 MEDAS';
    };

    
// POPULATE VALIDATORS WITH ACTIONS - FIXED mit echten Namen
UIManager.prototype.populateValidatorsWithActions = function(validators) {
    const validatorsContainer = document.getElementById('validators-list');
    if (!validatorsContainer) {
        console.error('❌ validators-list container not found!');
        return;
    }

    console.log('📊 Displaying validators with actions:', validators.length);

    // ERST: Cache alle Validator-Namen mit echten Daten
    validators.forEach(validator => {
        if (validator.description?.moniker) {
            this.validatorNameCache.set(validator.operator_address, validator.description.moniker);
            console.log(`💾 Cached validator name: ${validator.description.moniker} for ${validator.operator_address.slice(-8)}`);
        }
    });

    validatorsContainer.innerHTML = validators.map((validator, index) => {
        const commission = parseFloat(validator.commission?.commission_rates?.rate || 0) * 100;
        const votingPower = this.formatTokenAmount(validator.tokens, 6);
        const status = validator.status === 'BOND_STATUS_BONDED' ? 'Active' : 'Inactive';
        const jailed = validator.jailed ? 'Jailed' : 'OK';
        
        // ✅ VERWENDE ECHTE VALIDATOR-NAMEN DIREKT AUS DEN API-DATEN
        const validatorName = validator.description?.moniker || 
                             this.getValidatorName(validator.operator_address, validator);
        
        console.log(`🏷️ Displaying validator: ${validatorName} (was: ${this.getValidatorName(validator.operator_address)})`);
        
        return `
            <div class="delegation-item">
                <div class="validator-info">
                    <div class="validator-name">${validatorName}</div>
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
                    <button class="btn-small btn-primary" 
                            style="border-color: #00ffff; color: #00ffff; margin-right: 8px;" 
                            data-validator-address="${validator.operator_address}"
                            data-validator-name="${validatorName}"
                            onclick="window.selectValidatorAction(this)">
                        Select
                    </button>
                    <button class="btn-small btn-success" 
                            style="border-color: #00ff00; color: #00ff00;" 
                            data-validator-address="${validator.operator_address}"
                            data-validator-name="${validatorName}"
                            onclick="window.quickStakeAction(this)">
                        Quick Stake
                    </button>
                </div>
            </div>
        `;
    }).join('');

    console.log('✅ Validators HTML generated with REAL validator names');
};

    console.log('🎯 UI-Manager Staking extensions loaded');
    
} else {
    console.warn('⚠️ UIManager not found, staking extensions will load when UIManager is available');
}
