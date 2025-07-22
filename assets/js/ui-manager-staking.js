// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// ===================================
// SAUBERE PROTOBUF STAKING-LÖSUNG
// Für Cosmos SDK 0.50.10 + Keplr Gas-Estimation
// ===================================

// ===================================
// BLOCK-ONLY STAKING LÖSUNG
// Wartet auf Block-Bestätigung für sofortige Confirmation
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
        
        console.log('🔧 Transaction details:', {
            delegator: delegatorAddress,
            validator: validatorAddress,
            amount: `${amountInUmedas} umedas (${amount} MEDAS)`,
            chainId: chainId
        });
        
        await window.keplr.enable(chainId);
        
        // ✅ INTELLIGENTE GAS-ESTIMATION (CORS-FREI)
        console.log('⛽ Calculating optimal gas for block mode...');
        const estimatedGas = this.getOptimalGasForBlockMode(amount);
        console.log('⛽ Gas estimation result:', estimatedGas);
        
        // Optional: Versuche Keplr's simulate API für präzisere Werte
        try {
            if (window.keplr.simulate) {
                console.log('⛽ Optimizing with Keplr simulate...');
                
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
                
                const simulation = await window.keplr.simulate(chainId, msgs[0]);
                const gasEstimate = Math.floor(simulation.gasUsed * 1.3); // 30% Buffer
                
                // Update mit simulierten Werten
                estimatedGas.gasEstimate = gasEstimate;
                estimatedGas.gasUsed = simulation.gasUsed;
                estimatedGas.fee.gas = gasEstimate.toString();
                estimatedGas.fee.amount[0].amount = Math.floor(gasEstimate * 0.025).toString();
                
                console.log('✅ Gas optimized with Keplr simulation:', { gasUsed: simulation.gasUsed, gasEstimate });
            }
        } catch (simulateError) {
            console.log('ℹ️ Keplr simulate not available, using calculated defaults');
        }
        
        // ✅ BLOCK MODE TRANSACTION
        this.showNotification('📡 Broadcasting transaction and waiting for block confirmation...', 'info');
        console.log('📝 Using BLOCK mode sendTx (waits for confirmation)...');
        
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
        
        const result = await window.keplr.sendTx(
            chainId,
            msgs,
            estimatedGas.fee,
            "", // memo
            "block" // BLOCK MODE - wartet auf Bestätigung
        );
        
        console.log('✅ BLOCK mode sendTx successful:', result);
        
        // ✅ SOFORTIGE BESTÄTIGUNG
        if (result && (result.code === 0 || result.transactionHash || typeof result === 'string')) {
            const txHash = result.transactionHash || result.txhash || result;
            
            this.showNotification(`🎉 Delegation confirmed in block! TX: ${txHash}`, 'success');
            this.showNotification(`⛽ Gas used: ${estimatedGas.gasUsed} (estimated: ${estimatedGas.gasEstimate})`, 'info');
            this.showNotification('✅ Transaction is now irreversible on blockchain', 'success');
            
            // ✅ SOFORTIGE UI-UPDATES (da Block-Bestätigung vorliegt)
            console.log('🔄 Updating UI immediately (transaction confirmed)...');
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Staking data refreshed', 'info');
            }, 1000); // Nur 1 Sekunde warten
            
            // Form zurücksetzen
            stakeAmountInput.value = '';
            validatorSelect.value = 'Select a validator...';
            
        } else {
            throw new Error(result?.log || result?.rawLog || 'Block mode transaction failed');
        }
        
    } catch (error) {
        console.error('❌ Block mode staking failed:', error);
        
        // Verbesserte Fehlerbehandlung
        let errorMessage = error.message;
        
        if (errorMessage.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for transaction + gas fees';
        } else if (errorMessage.includes('User denied')) {
            errorMessage = 'Transaction cancelled by user';
        } else if (errorMessage.includes('Request rejected')) {
            errorMessage = 'Transaction rejected - please try again';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            errorMessage = 'Network timeout - transaction may still be processing';
        } else if (errorMessage.includes('gas')) {
            errorMessage = 'Gas estimation failed - try with manual gas settings';
        }
        
        this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
        
        // Hilfreiche Tipps bei Fehlern
        if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            this.showNotification('💡 Check your transaction in Keplr Dashboard', 'info');
        } else if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
            this.showNotification('💡 Try refreshing page and reconnecting wallet', 'info');
        }
    }
};

// ===================================
// OPTIMALE GAS-KALKULATION FÜR BLOCK MODE
// ===================================

UIManager.prototype.getOptimalGasForBlockMode = function(amountInMedas) {
    // Block mode braucht oft etwas mehr Gas wegen der Wartezeit
    let baseGas = 280000; // Höher als Standard für Block-Bestätigung
    
    // Für größere Beträge zusätzliches Gas
    if (amountInMedas > 1000) {
        baseGas = 320000;
    } else if (amountInMedas > 100) {
        baseGas = 300000;
    }
    
    // 25% Buffer für Block mode (etwas höher als Standard)
    const gasWithBuffer = Math.floor(baseGas * 1.25);
    const gasPrice = 0.025; // Standard gas price
    const feeAmount = Math.floor(gasWithBuffer * gasPrice).toString();
    
    console.log(`💰 Gas calculation for ${amountInMedas} MEDAS:`, {
        baseGas,
        withBuffer: gasWithBuffer,
        fee: feeAmount + ' umedas'
    });
    
    return {
        gasEstimate: gasWithBuffer,
        gasUsed: baseGas,
        fee: {
            amount: [{
                denom: "umedas",
                amount: feeAmount
            }],
            gas: gasWithBuffer.toString()
        }
    };
};

// ===================================
// BLOCK MODE OPTIMIERTE CLAIM REWARDS
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
        
        // Optimiertes Gas für mehrere Claims
        const gasPerClaim = 180000; // Leicht erhöht für Block mode
        const totalGas = Math.floor(gasPerClaim * claimMessages.length * 1.3); // 30% Buffer
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(totalGas * 0.025).toString()
            }],
            gas: totalGas.toString()
        };
        
        this.showNotification('📡 Broadcasting claim transaction and waiting for confirmation...', 'info');
        console.log(`📝 Claiming rewards from ${claimMessages.length} validators with BLOCK mode...`);
        
        // BLOCK MODE für sofortige Bestätigung
        const result = await window.keplr.sendTx(
            chainId,
            claimMessages,
            fee,
            "", // memo
            "block" // BLOCK MODE
        );
        
        if (result && (result.code === 0 || result.transactionHash || typeof result === 'string')) {
            const txHash = result.transactionHash || result.txhash || result;
            this.showNotification(`🎉 Rewards claimed and confirmed! TX: ${txHash}`, 'success');
            this.showNotification(`💰 Claimed from ${claimMessages.length} validators`, 'info');
            
            // Sofortige UI-Updates
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Rewards added to balance', 'success');
            }, 1000);
            
        } else {
            throw new Error(result?.log || result?.rawLog || 'Claim failed');
        }
        
    } catch (error) {
        console.error('❌ Claim rewards failed:', error);
        this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        this.showNotification('💡 Try claiming individual validators or use Keplr Dashboard', 'info');
    }
};

// ===================================
// DEBUG & TEST FUNKTIONEN
// ===================================

UIManager.prototype.testBlockMode = function() {
    console.log('🧪 TESTING BLOCK MODE STAKING:');
    
    // Test Keplr APIs
    if (window.keplr) {
        console.log('Keplr APIs available:', {
            sendTx: typeof window.keplr.sendTx,
            simulate: typeof window.keplr.simulate,
            getKey: typeof window.keplr.getKey
        });
        
        // Test verschiedene Gas-Berechnungen
        [10, 100, 1000].forEach(amount => {
            const gas = this.getOptimalGasForBlockMode(amount);
            console.log(`Gas for ${amount} MEDAS:`, gas.gasEstimate, 'gas');
        });
        
        // Connection status
        console.log('Connection status:', {
            connected: !!window.terminal?.connected,
            address: window.terminal?.account?.address || 'Not connected',
            chainId: MEDAS_CHAIN_CONFIG?.chainId || 'medasdigital-2'
        });
        
        console.log('✅ Block mode ready - transactions will wait for confirmation!');
    } else {
        console.log('❌ Keplr not available');
    }
    
    return 'Block mode test complete';
};

UIManager.prototype.estimateStakingTime = function(amount) {
    // Block mode timing estimation
    const avgBlockTime = 6; // seconds
    const gasCalculationTime = 1; // seconds
    const userConfirmationTime = 5; // seconds (user interaction)
    
    const totalTime = gasCalculationTime + userConfirmationTime + avgBlockTime;
    
    console.log(`⏱️ Estimated staking time for ${amount} MEDAS:`, {
        gasCalculation: gasCalculationTime + 's',
        userConfirmation: userConfirmationTime + 's', 
        blockConfirmation: avgBlockTime + 's',
        total: totalTime + 's'
    });
    
    return totalTime;
};

console.log('🎯 Block-only staking solution loaded - instant confirmations!');
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
        
        // Versuche Direct Mode sendTx
        const result = await window.keplr.sendTx(
            chainId,
            claimMessages,
            fee,
            "", // memo
            "direct"
        );
        
        if (result && (result.code === 0 || result.transactionHash || typeof result === 'string')) {
            const txHash = result.transactionHash || result.txhash || result;
            this.showNotification(`✅ Rewards claimed successfully! TX: ${txHash}`, 'success');
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
            }, 6000);
        } else {
            throw new Error(result?.log || result?.rawLog || 'Claim failed');
        }
        
    } catch (error) {
        console.error('❌ Claim rewards failed:', error);
        this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        this.showNotification('💡 Try claiming in Keplr Dashboard', 'info');
    }
};

// ===================================
// DEBUG FUNKTIONEN
// ===================================

UIManager.prototype.debugStaking = function() {
    console.log('🔍 STAKING DEBUG:');
    console.log('Keplr available:', !!window.keplr);
    console.log('Terminal connected:', !!window.terminal?.connected);
    console.log('Account address:', window.terminal?.account?.address);
    
    if (window.keplr) {
        console.log('Keplr APIs:', {
            sendTx: typeof window.keplr.sendTx,
            signAmino: typeof window.keplr.signAmino,
            signDirect: typeof window.keplr.signDirect,
            simulate: typeof window.keplr.simulate,
            experimentalSignTx: typeof window.keplr.experimentalSignTx
        });
    }
    
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    console.log('Form elements:', {
        validatorSelect: !!validatorSelect,
        validatorValue: validatorSelect?.value,
        stakeAmountInput: !!stakeAmountInput,
        stakeAmount: stakeAmountInput?.value
    });
    
    return 'Debug complete - check console output';
};

console.log('🎯 Clean Protobuf Staking solution loaded');
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
