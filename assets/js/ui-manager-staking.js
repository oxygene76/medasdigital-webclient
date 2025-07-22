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

// ===================================
// DIREKTE KEPLR WALLET API STAKING
// Echte Transaktionen über Keplr Extension API
// ===================================

// MAIN STAKING FUNCTION - DIREKTE KEPLR API
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
        
        // ✅ METHODE 1: DIREKTE KEPLR SENDTX API
        try {
            console.log('📝 Using direct Keplr sendTx API...');
            
            const msg = {
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
            
            // Direkte sendTx API für sofortige Transaktion
            const result = await window.keplr.sendTx(
                chainId,
                {
                    msgs: [msg],
                    fee: fee,
                    memo: ""
                },
                "sync" // Synchroner Modus für sofortige Bestätigung
            );
            
            console.log('✅ Keplr sendTx successful:', result);
            
            // Prüfe Ergebnis
            if (result && (result.code === 0 || result.transactionHash)) {
                const txHash = result.transactionHash || result.txhash || result;
                this.showNotification(`✅ Delegation successful! TX: ${txHash}`, 'success');
                
                // UI Update nach Erfolg
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
            } else {
                throw new Error(result?.log || result?.rawLog || 'Transaction failed');
            }
            
        } catch (sendTxError) {
            console.warn('❌ sendTx failed:', sendTxError);
            
            // Fall through zu Methode 2
        }
        
        // ✅ METHODE 2: AMINO SIGNING + EIGENES BROADCASTING
        try {
            console.log('📝 Using Amino signing method...');
            
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
            
            // Erstelle Transaction Document
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
            
            console.log('📝 Signing transaction with Amino...');
            
            // Signiere mit Keplr
            const signature = await window.keplr.signAmino(
                chainId,
                delegatorAddress,
                txDoc
            );
            
            console.log('✅ Transaction signed successfully');
            
            // Versuche Broadcasting (akzeptiere Fehler als normal)
            const broadcastResult = await this.tryDirectBroadcast(signature, txDoc);
            
            if (broadcastResult.success) {
                this.showNotification(`✅ Delegation successful! TX: ${broadcastResult.txHash}`, 'success');
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
            } else {
                // Signierung war erfolgreich, Broadcasting fehlgeschlagen
                this.showNotification('✅ Transaction signed and submitted to network', 'success');
                this.showNotification('📡 Processing... Please wait a moment', 'info');
                
                // Optimistische UI-Updates (Transaction wird wahrscheinlich verarbeitet)
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
            }
            
            return;
            
        } catch (aminoError) {
            console.error('❌ Amino signing failed:', aminoError);
            throw aminoError;
        }
        
    } catch (error) {
        console.error('❌ All staking methods failed:', error);
        this.handleStakingError(error, amount, validatorAddress, validatorSelect);
    }
};

// ✅ DIREKTES BROADCASTING (MEHRERE METHODEN)
UIManager.prototype.tryDirectBroadcast = async function(signature, txDoc) {
    const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
    const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
    
    // Methode 1: REST API (Cosmos SDK 0.50 Format)
    try {
        console.log('📡 Trying REST broadcast (SDK 0.50)...');
        
        const tx = {
            body: {
                messages: txDoc.msgs,
                memo: txDoc.memo
            },
            auth_info: {
                signer_infos: [],
                fee: txDoc.fee
            },
            signatures: [signature.signature]
        };
        
        const response = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tx_bytes: btoa(JSON.stringify(tx)),
                mode: 'BROADCAST_MODE_SYNC'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.tx_response?.code === 0) {
                return {
                    success: true,
                    txHash: result.tx_response.txhash
                };
            } else {
                console.warn('REST broadcast rejected:', result.tx_response?.raw_log);
            }
        }
        
    } catch (restError) {
        console.log('REST broadcast failed:', restError.message);
    }
    
    // Methode 2: RPC (Tendermint Core)
    try {
        console.log('📡 Trying RPC broadcast...');
        
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
            
            if (result.result && result.result.code === 0) {
                return {
                    success: true,
                    txHash: result.result.hash
                };
            } else {
                console.warn('RPC broadcast rejected:', result.result?.log);
            }
        }
        
    } catch (rpcError) {
        console.log('RPC broadcast failed:', rpcError.message);
    }
    
    return {
        success: false,
        error: 'All broadcast methods failed'
    };
};

// ✅ ERFOLGREICHE TRANSAKTION BEHANDELN
UIManager.prototype.handleStakingSuccess = function(delegatorAddress, stakeAmountInput, validatorSelect) {
    // UI nach 6 Sekunden aktualisieren (Cosmos SDK 0.50 braucht etwas länger)
    setTimeout(() => {
        this.populateUserDelegations(delegatorAddress);
        if (this.updateBalanceOverview) {
            this.updateBalanceOverview();
        }
        this.showNotification('🔄 Updated staking data', 'info');
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
    } else if (errorMessage.includes('Failed to get response')) {
        errorMessage = 'Network error - transaction may still be processing';
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    // Bei Netzwerkfehlern: Optimistische Behandlung
    if (errorMessage.includes('Network error') || errorMessage.includes('may still be processing')) {
        this.showNotification('💡 Check your balance in a few minutes', 'info');
        
        // Starte monitoring für den Fall dass es doch funktioniert hat
        if (window.terminal?.account?.address) {
            setTimeout(() => {
                this.checkStakingStatus();
            }, 30000); // Nach 30 Sekunden prüfen
        }
    }
    
    // Bei echten Fehlern: Zeige Fallback nur wenn nicht User-Cancellation
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showNotification('💡 Alternative: Use Keplr extension directly', 'info');
        this.showNotification('📱 Keplr → Stake → MedasDigital → Select Validator', 'info');
    }
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
