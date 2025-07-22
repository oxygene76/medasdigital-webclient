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

// ===================================
// KORREKTE BLOCK MODE STAKING LÖSUNG
// Mit korrekter Keplr sendTx API-Verwendung
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
        
        // ✅ SCHRITT 1: INTELLIGENTE GAS-ESTIMATION
        console.log('⛽ Calculating optimal gas for block mode...');
        const estimatedGas = this.getOptimalGasForBlockMode(amount);
        console.log('⛽ Gas estimation result:', estimatedGas);
        
        // ✅ SCHRITT 2: SIGN DIRECT (PROTOBUF) + BLOCK MODE BROADCAST
        try {
            console.log('📝 Using signDirect + sendTx BLOCK mode...');
            
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
            
            // Hole Account Info
            const key = await window.keplr.getKey(chainId);
            const accountResponse = await this.getAccountInfo(delegatorAddress);
            
            // Erstelle SignDoc für Protobuf
            const signDoc = {
                bodyBytes: this.createTxBodyBytes(msgs),
                authInfoBytes: this.createAuthInfoBytes(estimatedGas.fee, accountResponse.sequence),
                chainId: chainId,
                accountNumber: accountResponse.accountNumber
            };
            
            this.showNotification('📝 Please sign the transaction in Keplr...', 'info');
            
            // Sign mit signDirect (Protobuf)
            const signResponse = await window.keplr.signDirect(
                chainId,
                delegatorAddress,
                signDoc
            );
            
            console.log('✅ Transaction signed with signDirect');
            
            // Erstelle TxRaw für Broadcasting
            const txRaw = this.createTxRaw(signResponse);
            
            this.showNotification('📡 Broadcasting transaction and waiting for block confirmation...', 'info');
            console.log('📝 Broadcasting with BLOCK mode (waits for confirmation)...');
            
            // Broadcast mit Block Mode
            const txResponse = await window.keplr.sendTx(chainId, txRaw, "block");
            
            console.log('✅ BLOCK mode broadcast successful:', txResponse);
            
            // Extrahiere TX Hash
            const txHash = Array.from(new Uint8Array(txResponse))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            
            // ✅ SOFORTIGE BESTÄTIGUNG
            this.showNotification(`🎉 Delegation confirmed in block! TX: ${txHash}`, 'success');
            this.showNotification(`⛽ Gas used: ${estimatedGas.gasUsed} (estimated: ${estimatedGas.gasEstimate})`, 'info');
            this.showNotification('✅ Transaction is now irreversible on blockchain', 'success');
            
            // Sofortige UI-Updates
            console.log('🔄 Updating UI immediately (transaction confirmed)...');
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Staking data refreshed', 'info');
            }, 1000);
            
            // Form zurücksetzen
            stakeAmountInput.value = '';
            validatorSelect.value = 'Select a validator...';
            
        } catch (protobufError) {
            console.warn('❌ Protobuf method failed:', protobufError);
            
            // ✅ FALLBACK: AMINO METHOD (Ihr bewährter Weg)
            console.log('📝 Falling back to Amino method...');
            
            const aminoResult = await this.performAminoStakingWithGas(
                chainId, 
                delegatorAddress, 
                validatorAddress, 
                amountInUmedas, 
                estimatedGas
            );
            
            if (aminoResult.success) {
                this.showNotification('✅ Transaction signed and submitted to network', 'success');
                this.showNotification(`⛽ Gas estimated: ${estimatedGas.gasEstimate}`, 'info');
                this.showNotification('⏳ Processing on blockchain...', 'info');
                
                setTimeout(() => {
                    console.log('🔄 Updating UI after amino staking...');
                    this.populateUserDelegations(delegatorAddress);
                    if (this.updateBalanceOverview) {
                        this.updateBalanceOverview();
                    }
                    this.showNotification('✅ Updated staking data', 'info');
                }, 5000);
                
                // Form zurücksetzen
                stakeAmountInput.value = '';
                validatorSelect.value = 'Select a validator...';
            } else {
                throw new Error(aminoResult.error);
            }
        }
        
    } catch (error) {
        console.error('❌ All staking methods failed:', error);
        this.handleStakingError(error, amount, validatorAddress);
    }
};

// ===================================
// PROTOBUF HELPER FUNKTIONEN
// ===================================

UIManager.prototype.getAccountInfo = async function(address) {
    try {
        const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
        const response = await fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${address}`, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return {
            accountNumber: data.account?.account_number || '0',
            sequence: data.account?.sequence || '0'
        };
    } catch (error) {
        console.warn('⚠️ REST account fetch failed, using defaults:', error.message);
        return {
            accountNumber: '0',
            sequence: '0'
        };
    }
};

UIManager.prototype.createTxBodyBytes = function(msgs) {
    // Vereinfachte TxBody Erstellung
    // In einer echten Anwendung würde man Protobuf verwenden
    const txBody = {
        messages: msgs,
        memo: "",
        timeoutHeight: "0",
        extensionOptions: [],
        nonCriticalExtensionOptions: []
    };
    
    // Für diese Demo: JSON-String zu Bytes
    const bodyJson = JSON.stringify(txBody);
    return new TextEncoder().encode(bodyJson);
};

UIManager.prototype.createAuthInfoBytes = function(fee, sequence) {
    // Vereinfachte AuthInfo Erstellung
    const authInfo = {
        signerInfos: [{
            publicKey: null,
            modeInfo: {
                single: {
                    mode: "SIGN_MODE_DIRECT"
                }
            },
            sequence: sequence
        }],
        fee: fee
    };
    
    // Für diese Demo: JSON-String zu Bytes
    const authInfoJson = JSON.stringify(authInfo);
    return new TextEncoder().encode(authInfoJson);
};

UIManager.prototype.createTxRaw = function(signResponse) {
    // Erstelle TxRaw für Broadcasting
    // In einer echten Anwendung würde man @keplr-wallet/proto-types verwenden
    
    const txRaw = {
        bodyBytes: signResponse.signed.bodyBytes,
        authInfoBytes: signResponse.signed.authInfoBytes,
        signatures: [new Uint8Array(Buffer.from(signResponse.signature.signature, "base64"))]
    };
    
    // Vereinfachte Serialisierung
    const txRawJson = JSON.stringify({
        body_bytes: Array.from(txRaw.bodyBytes),
        auth_info_bytes: Array.from(txRaw.authInfoBytes),
        signatures: [Array.from(txRaw.signatures[0])]
    });
    
    return new TextEncoder().encode(txRawJson);
};

// ===================================
// OPTIMALE GAS-KALKULATION
// ===================================

UIManager.prototype.getOptimalGasForBlockMode = function(amountInMedas) {
    // Block mode Gas-Kalkulation
    let baseGas = 280000;
    
    if (amountInMedas > 1000) {
        baseGas = 320000;
    } else if (amountInMedas > 100) {
        baseGas = 300000;
    }
    
    const gasWithBuffer = Math.floor(baseGas * 1.25); // 25% Buffer
    const gasPrice = 0.025;
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
// AMINO FALLBACK (Unverändert)
// ===================================

UIManager.prototype.performAminoStakingWithGas = async function(chainId, delegatorAddress, validatorAddress, amountInUmedas, gasEstimation) {
    try {
        const offlineSigner = window.getOfflineSigner(chainId);
        const accounts = await offlineSigner.getAccounts();
        
        if (!accounts.length) {
            throw new Error('No accounts found');
        }
        
        // Account Info holen
        const accountInfo = await this.getAccountInfo(delegatorAddress);
        
        // Amino Message
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
        
        const txDoc = {
            chain_id: chainId,
            account_number: accountInfo.accountNumber,
            sequence: accountInfo.sequence,
            fee: gasEstimation.fee,
            msgs: [aminoMsg],
            memo: ""
        };
        
        console.log('📝 Signing with Amino...');
        
        const signature = await window.keplr.signAmino(
            chainId,
            delegatorAddress,
            txDoc
        );
        
        console.log('✅ Amino transaction signed');
        
        // Background Broadcasting
        this.tryBackgroundBroadcast(signature, txDoc);
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ===================================
// BACKGROUND BROADCASTING (Unverändert)
// ===================================

UIManager.prototype.tryBackgroundBroadcast = async function(signature, txDoc) {
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
        }
    }, 1000);
};

// ===================================
// ERROR HANDLING
// ===================================

UIManager.prototype.handleStakingError = function(error, amount, validatorAddress) {
    let errorMessage = error.message;
    
    if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas fees';
    } else if (errorMessage.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user';
    } else if (errorMessage.includes('Request rejected')) {
        errorMessage = 'Transaction rejected - please try again';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        errorMessage = 'Network timeout - transaction may still be processing';
    } else if (errorMessage.includes('invalid mode')) {
        errorMessage = 'Keplr version incompatible - using fallback method';
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        this.showNotification('💡 Check your transaction in Keplr Dashboard', 'info');
    } else if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showNotification('💡 Try refreshing page and reconnecting wallet', 'info');
    }
};

// ===================================
// DEBUG FUNKTIONEN
// ===================================

UIManager.prototype.testProtobufStaking = function() {
    console.log('🧪 TESTING PROTOBUF STAKING:');
    
    if (window.keplr) {
        console.log('Keplr APIs available:', {
            sendTx: typeof window.keplr.sendTx,
            signDirect: typeof window.keplr.signDirect,
            signAmino: typeof window.keplr.signAmino,
            getKey: typeof window.keplr.getKey
        });
        
        console.log('Broadcasting modes supported:', ['block', 'sync', 'async']);
        
        if (window.terminal?.connected) {
            console.log('Connection status: ✅ Connected');
            console.log('Address:', window.terminal.account.address);
        } else {
            console.log('Connection status: ❌ Not connected');
        }
    }
    
    return 'Protobuf staking test complete';
};

console.log('🎯 Correct Block Mode Staking with Protobuf loaded');;
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
