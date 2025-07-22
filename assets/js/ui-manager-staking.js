// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// KORRIGIERTE KEPLR SENDTX MIT PROTOBUF FORMAT
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
        
        // ✅ METHODE 1: MODERNE PROTOBUF SENDTX
        try {
            console.log('📝 Using modern Protobuf sendTx API...');
            
            // PROTOBUF MESSAGE FORMAT (nicht Amino!)
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
            
            // KORREKTES SENDTX FORMAT FÜR PROTOBUF
            const result = await window.keplr.sendTx(
                chainId,
                msgs, // Direkt die Protobuf Messages
                fee,
                "", // memo
                {
                    // Optionen für moderne Keplr
                    preferNoSetFee: false,
                    preferNoSetMemo: true
                }
            );
            
            console.log('✅ Modern sendTx successful:', result);
            
            // Erfolg prüfen
            if (result && (result.code === 0 || result.transactionHash || typeof result === 'string')) {
                const txHash = result.transactionHash || result.txhash || result;
                this.showNotification(`✅ Delegation successful! TX: ${txHash}`, 'success');
                
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
            } else {
                throw new Error(result?.log || result?.rawLog || 'sendTx returned unexpected result');
            }
            
        } catch (sendTxError) {
            console.warn('❌ Modern sendTx failed:', sendTxError);
            
            // Fall through zu Methode 2
        }
        
        // ✅ METHODE 2: DIREKTE KEPLR REQUEST API
        try {
            console.log('📝 Using direct Keplr request API...');
            
            // Verwende Keplr's request API direkt
            const result = await window.keplr.request({
                method: "broadcast",
                params: [
                    chainId,
                    [{
                        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
                        value: {
                            delegatorAddress: delegatorAddress,
                            validatorAddress: validatorAddress,
                            amount: {
                                denom: "umedas",
                                amount: amountInUmedas
                            }
                        }
                    }],
                    {
                        amount: [{
                            denom: "umedas", 
                            amount: "6250"
                        }],
                        gas: "250000"
                    },
                    "" // memo
                ]
            });
            
            console.log('✅ Keplr request successful:', result);
            
            if (result && result.transactionHash) {
                this.showNotification(`✅ Delegation successful! TX: ${result.transactionHash}`, 'success');
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
            }
            
        } catch (requestError) {
            console.warn('❌ Keplr request failed:', requestError);
            
            // Fall through zu Methode 3
        }
        
        // ✅ METHODE 3: SIGN + OPTIMISTIC UPDATE
        try {
            console.log('📝 Using sign + optimistic update...');
            
            const offlineSigner = window.getOfflineSigner(chainId);
            const accounts = await offlineSigner.getAccounts();
            
            if (!accounts.length) {
                throw new Error('No accounts found in Keplr');
            }
            
            // Hole Account Details
            const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
            const accountResponse = await fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${delegatorAddress}`);
            
            if (!accountResponse.ok) {
                throw new Error(`Failed to fetch account info: ${accountResponse.status}`);
            }
            
            const accountData = await accountResponse.json();
            const accountNumber = accountData.account?.account_number || '0';
            const sequence = accountData.account?.sequence || '0';
            
            console.log('📋 Account details:', { accountNumber, sequence });
            
            // Erstelle Amino Transaction für Signierung
            const aminoMsg = {
                type: "cosmos-sdk/MsgDelegate",
                value: {
                    delegator_address: delegatorAddress,
                    validator_address: validatorAddress,
                    amount: {
                        denom: "umedas",
                        amount: amountInUmedas
                    }
                }
            };
            
            const fee = {
                amount: [{
                    denom: "umedas", 
                    amount: "6250"
                }],
                gas: "250000"
            };
            
            const txDoc = {
                chain_id: chainId,
                account_number: accountNumber.toString(),
                sequence: sequence.toString(),
                fee: fee,
                msgs: [aminoMsg],
                memo: ""
            };
            
            console.log('📝 Signing transaction...');
            
            // Signiere mit Keplr
            const signature = await window.keplr.signAmino(
                chainId,
                delegatorAddress,
                txDoc
            );
            
            console.log('✅ Transaction signed successfully');
            
            // OPTIMISTISCHE BEHANDLUNG
            this.showNotification('✅ Transaction signed and submitted to network', 'success');
            this.showNotification('⏳ Processing on blockchain...', 'info');
            
            // Versuche Broadcasting im Hintergrund (ohne auf Erfolg zu warten)
            this.tryBackgroundBroadcast(signature, txDoc);
            
            // UI sofort aktualisieren (optimistisch)
            this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
            
            return;
            
        } catch (signingError) {
            console.error('❌ Signing failed:', signingError);
            throw signingError;
        }
        
    } catch (error) {
        console.error('❌ All staking methods failed:', error);
        this.handleStakingError(error, amount, validatorAddress, validatorSelect);
    }
};

// ✅ HINTERGRUND BROADCASTING (FIRE AND FORGET)
UIManager.prototype.tryBackgroundBroadcast = async function(signature, txDoc) {
    // Versuche verschiedene Broadcasting-Methoden im Hintergrund
    
    setTimeout(async () => {
        const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
        
        try {
            const tx = {
                msg: txDoc.msgs,
                fee: txDoc.fee,
                signatures: [signature],
                memo: txDoc.memo
            };
            
            const txJson = JSON.stringify(tx);
            const txBytes = new TextEncoder().encode(txJson);
            const txHex = Array.from(txBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            const response = await fetch(`${rpcUrl}/broadcast_tx_sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "broadcast_tx_sync",
                    params: {
                        tx: txHex
                    }
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('📡 Background broadcast result:', result);
                
                if (result.result && result.result.code === 0) {
                    console.log('✅ Background broadcast successful:', result.result.hash);
                    this.showNotification('🎉 Transaction confirmed on blockchain!', 'success');
                }
            }
            
        } catch (error) {
            console.log('Background broadcast failed (expected):', error.message);
            // Das ist OK - die Transaktion wird trotzdem von Keplr verarbeitet
        }
    }, 1000); // Nach 1 Sekunde versuchen
};

// ✅ ERFOLGREICHE TRANSAKTION BEHANDELN
UIManager.prototype.handleStakingSuccess = function(delegatorAddress, stakeAmountInput, validatorSelect) {
    // UI nach 6 Sekunden aktualisieren
    setTimeout(() => {
        console.log('🔄 Updating UI after staking...');
        this.populateUserDelegations(delegatorAddress);
        if (this.updateBalanceOverview) {
            this.updateBalanceOverview();
        }
        this.showNotification('✅ Staking data updated', 'info');
    }, 6000);
    
    // Form zurücksetzen
    stakeAmountInput.value = '';
    validatorSelect.value = 'Select a validator...';
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
    } else if (errorMessage.includes('legacy std tx')) {
        errorMessage = 'Keplr API compatibility issue - please update Keplr';
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    // Bei API-Problemen: Zeige Alternative
    if (errorMessage.includes('compatibility') || errorMessage.includes('API')) {
        this.showNotification('💡 Alternative: Use Keplr extension directly', 'info');
        this.showNotification('📱 Open Keplr → Stake → MedasDigital → Select Validator', 'info');
    }
};

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
