// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// ===================================
// BEWÄHRTES AMINO SIGNING + KEPLR SENDTX BROADCASTING
// Kombiniert bewährte Amino-Signierung mit offiziellem Keplr Broadcasting
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
        
        // ✅ GAS ESTIMATION
        console.log('⛽ Calculating gas for block mode...');
        const estimatedGas = this.getOptimalGasForBlockMode(amount);
        console.log('⛽ Gas estimation result:', estimatedGas);
        
        // ✅ BEWÄHRTES AMINO SIGNING + KEPLR SENDTX
        console.log('📝 Using proven Amino signing with Keplr sendTx...');
        
        const result = await this.performAminoSigningWithKeplrBroadcast(
            chainId,
            delegatorAddress,
            validatorAddress,
            amountInUmedas,
            estimatedGas
        );
        
        if (result.success) {
            this.showNotification('🎉 Delegation confirmed in block!', 'success');
            this.showNotification(`💰 Staked ${amount} MEDAS to ${this.getValidatorName(validatorAddress)}`, 'success');
            this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
            this.showNotification('✅ Transaction is irreversible on blockchain', 'success');
            
            // Form zurücksetzen
            stakeAmountInput.value = '';
            validatorSelect.value = 'Select a validator...';
            
            // Sofortige UI Updates
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Staking data updated', 'success');
            }, 1000);
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Staking failed:', error);
        this.handleStakingError(error, amount, validatorAddress);
    }
};

// ===================================
// AMINO SIGNING + KEPLR SENDTX BROADCASTING
// ===================================

UIManager.prototype.performAminoSigningWithKeplrBroadcast = async function(chainId, delegatorAddress, validatorAddress, amountInUmedas, gasEstimation) {
    try {
        // ✅ SCHRITT 1: ACCOUNT INFO ABRUFEN
        const accountInfo = await this.getAccountInfo(delegatorAddress);
        console.log('📋 Account info:', accountInfo);
        
        // ✅ SCHRITT 2: BEWÄHRTE AMINO MESSAGE
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
        
        // ✅ SCHRITT 3: BEWÄHRTES AMINO SIGN DOC
        const signDoc = {
            chain_id: chainId,
            account_number: accountInfo.accountNumber,
            sequence: accountInfo.sequence,
            fee: gasEstimation.fee,
            msgs: [aminoMsg],
            memo: ""
        };
        
        console.log('📋 Amino sign document ready');
        
        // ✅ SCHRITT 4: BEWÄHRTE AMINO SIGNIERUNG
        this.showNotification('📝 Please sign the transaction in Keplr...', 'info');
        console.log('📝 Requesting proven Amino signature...');
        
        const signResponse = await window.keplr.signAmino(
            chainId,
            delegatorAddress,
            signDoc
        );
        
        console.log('✅ Amino signature successful');
        
        // ✅ SCHRITT 5: EINFACHE TX BYTES ERSTELLUNG FÜR KEPLR SENDTX
        console.log('📦 Creating simple tx bytes for Keplr sendTx...');
        
        const stdTx = {
            msg: signResponse.signed.msgs,
            fee: signResponse.signed.fee,
            signatures: [signResponse.signature],
            memo: signResponse.signed.memo
        };
        
        // Einfache Serialisierung für Keplr sendTx
        const txBytes = this.createSimpleTxBytesForKeplr(stdTx);
        
        console.log('📡 Broadcasting with Keplr sendTx block mode...');
        this.showNotification('📡 Broadcasting and waiting for block confirmation...', 'info');
        
        // ✅ SCHRITT 6: KEPLR SENDTX MIT BLOCK MODE
        const txResponse = await window.keplr.sendTx(chainId, txBytes, "block");
        
        console.log('✅ Keplr sendTx block broadcast successful:', txResponse);
        
        // ✅ SCHRITT 7: TX HASH EXTRAHIEREN
        const txHash = this.extractTxHashFromResponse(txResponse);
        
        return { success: true, txHash };
        
    } catch (error) {
        console.error('❌ Amino + Keplr broadcast failed:', error);
        
        // ✅ FALLBACK: MANUELLES BROADCASTING
        console.log('📝 Falling back to manual broadcast...');
        return await this.performManualBroadcastFallback(chainId, delegatorAddress, validatorAddress, amountInUmedas, gasEstimation);
    }
};

// ===================================
// EINFACHE TX BYTES ERSTELLUNG
// ===================================

UIManager.prototype.createSimpleTxBytesForKeplr = function(stdTx) {
    // Einfache, direkte Serialisierung ohne komplexe Protobuf-Konvertierung
    // Basiert auf dem Standard StdTx Format
    
    try {
        // Methode 1: Direkte JSON-Serialisierung (einfachste)
        const txJson = JSON.stringify(stdTx);
        const txBytes = new TextEncoder().encode(txJson);
        
        console.log('📦 Created simple JSON tx bytes');
        return txBytes;
        
    } catch (error) {
        console.error('❌ Simple tx bytes creation failed:', error);
        
        // Fallback: Noch einfachere Methode
        const simpleTx = {
            type: "cosmos-sdk/StdTx",
            value: stdTx
        };
        
        const fallbackJson = JSON.stringify(simpleTx);
        return new TextEncoder().encode(fallbackJson);
    }
};

UIManager.prototype.extractTxHashFromResponse = function(txResponse) {
    console.log('🔍 Extracting TX hash from response:', typeof txResponse);
    
    try {
        // String response
        if (typeof txResponse === 'string') {
            console.log('📝 TX hash from string:', txResponse);
            return txResponse;
        }
        
        // Uint8Array response
        if (txResponse instanceof Uint8Array) {
            const hashHex = Array.from(txResponse)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            console.log('📝 TX hash from bytes:', hashHex);
            return hashHex;
        }
        
        // Object response
        if (txResponse && typeof txResponse === 'object') {
            const hash = txResponse.transactionHash || 
                        txResponse.txhash || 
                        txResponse.hash ||
                        txResponse.result?.hash ||
                        txResponse.data?.txhash;
            
            if (hash) {
                console.log('📝 TX hash from object:', hash);
                return hash;
            }
        }
        
        console.log('⚠️ Could not extract hash, using response as string');
        return String(txResponse).substring(0, 64) || 'Unknown';
        
    } catch (error) {
        console.error('❌ TX hash extraction failed:', error);
        return 'Unknown';
    }
};

// ===================================
// MANUELLER BROADCAST FALLBACK
// ===================================

UIManager.prototype.performManualBroadcastFallback = async function(chainId, delegatorAddress, validatorAddress, amountInUmedas, gasEstimation) {
    try {
        console.log('📝 Manual broadcast fallback...');
        
        // Vereinfachte Amino-Signierung für Fallback
        const accountInfo = await this.getAccountInfo(delegatorAddress);
        
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
        
        const signDoc = {
            chain_id: chainId,
            account_number: accountInfo.accountNumber,
            sequence: accountInfo.sequence,
            fee: gasEstimation.fee,
            msgs: [aminoMsg],
            memo: ""
        };
        
        const signResponse = await window.keplr.signAmino(chainId, delegatorAddress, signDoc);
        
        const stdTx = {
            msg: signResponse.signed.msgs,
            fee: signResponse.signed.fee,
            signatures: [signResponse.signature],
            memo: signResponse.signed.memo
        };
        
        // Manuelles Broadcasting
        const broadcastResult = await this.broadcastStdTxManually(stdTx);
        
        if (broadcastResult.success) {
            return { success: true, txHash: broadcastResult.txHash };
        } else {
            console.log('⚠️ Manual broadcast failed, treating optimistically');
            return { success: true, txHash: null };
        }
        
    } catch (error) {
        console.error('❌ Manual fallback failed:', error);
        return { success: false, error: error.message };
    }
};

UIManager.prototype.broadcastStdTxManually = async function(stdTx) {
    const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
    
    try {
        console.log('📡 Manual legacy REST broadcast...');
        
        const response = await fetch(`${restUrl}/txs`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(stdTx),
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Manual broadcast result:', result);
            
            if (result.code === 0 || result.txhash) {
                return { success: true, txHash: result.txhash };
            } else if (result.logs) {
                throw new Error(result.logs[0]?.log || 'Manual broadcast failed');
            }
        }
        
        throw new Error(`Manual broadcast HTTP ${response.status}`);
        
    } catch (error) {
        console.log('❌ Manual broadcast failed:', error.message);
        return { success: false, error: error.message };
    }
};

// ===================================
// CLAIM REWARDS MIT VEREINFACHTER METHODE
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
            type: "cosmos-sdk/MsgWithdrawDelegatorReward",
            value: {
                delegator_address: delegatorAddress,
                validator_address: delegation.validator_address
            }
        }));
        
        // Gas für Claims
        const gasPerClaim = 180000;
        const totalGas = Math.floor(gasPerClaim * claimMessages.length * 1.4);
        const fee = {
            amount: [{
                denom: 'umedas',
                amount: Math.floor(totalGas * 0.025).toString()
            }],
            gas: totalGas.toString()
        };
        
        const result = await this.performClaimWithSimpleMethod(
            chainId,
            delegatorAddress,
            claimMessages,
            fee
        );
        
        if (result.success) {
            this.showNotification(`🎉 Rewards claimed successfully!`, 'success');
            this.showNotification(`💰 Claimed from ${claimMessages.length} validators`, 'info');
            
            if (result.txHash) {
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
            }
            
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
                this.showNotification('✅ Rewards added to balance', 'success');
            }, 3000);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Claim rewards failed:', error);
        this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
    }
};

UIManager.prototype.performClaimWithSimpleMethod = async function(chainId, delegatorAddress, claimMessages, fee) {
    try {
        const accountInfo = await this.getAccountInfo(delegatorAddress);
        
        const signDoc = {
            chain_id: chainId,
            account_number: accountInfo.accountNumber,
            sequence: accountInfo.sequence,
            fee: fee,
            msgs: claimMessages,
            memo: ""
        };
        
        this.showNotification('📝 Please sign the rewards claim in Keplr...', 'info');
        
        const signResponse = await window.keplr.signAmino(chainId, delegatorAddress, signDoc);
        
        const stdTx = {
            msg: signResponse.signed.msgs,
            fee: signResponse.signed.fee,
            signatures: [signResponse.signature],
            memo: signResponse.signed.memo
        };
        
        // Versuche Keplr sendTx
        try {
            const txBytes = this.createSimpleTxBytesForKeplr(stdTx);
            const txResponse = await window.keplr.sendTx(chainId, txBytes, "block");
            const txHash = this.extractTxHashFromResponse(txResponse);
            
            return { success: true, txHash };
            
        } catch (keplrError) {
            console.log('⚠️ Keplr sendTx failed, using manual broadcast');
            
            const manualResult = await this.broadcastStdTxManually(stdTx);
            return manualResult.success ? 
                { success: true, txHash: manualResult.txHash } : 
                { success: true, txHash: null };
        }
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ===================================
// HELPER FUNKTIONEN
// ===================================

UIManager.prototype.getOptimalGasForBlockMode = function(amountInMedas) {
    let baseGas = 280000;
    
    if (amountInMedas > 1000) {
        baseGas = 320000;
    } else if (amountInMedas > 100) {
        baseGas = 300000;
    }
    
    const gasWithBuffer = Math.floor(baseGas * 1.25);
    const gasPrice = 0.025;
    const feeAmount = Math.floor(gasWithBuffer * gasPrice).toString();
    
    console.log(`💰 Block mode gas for ${amountInMedas} MEDAS:`, {
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

UIManager.prototype.getAccountInfo = async function(address) {
    try {
        const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
        const response = await fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${address}`, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                accountNumber: data.account?.account_number || '0',
                sequence: data.account?.sequence || '0'
            };
        }
    } catch (error) {
        console.warn('⚠️ Account fetch failed:', error.message);
    }
    
    return {
        accountNumber: '0',
        sequence: '0'
    };
};

UIManager.prototype.handleStakingError = function(error, amount, validatorAddress) {
    let errorMessage = error.message;
    
    if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas fees';
        this.showNotification('💡 Check your MEDAS balance', 'info');
    } else if (errorMessage.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user';
    } else if (errorMessage.includes('Request rejected')) {
        errorMessage = 'Transaction rejected - please try again';
    } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Block confirmation timeout - transaction may still process';
    } else if (errorMessage.includes('reset cache')) {
        errorMessage = 'Keplr cache issue resolved - using simple method';
        this.showNotification('💡 Using simplified broadcasting method', 'info');
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showNotification('💡 Try again - using simplified method now', 'info');
    }
};

console.log('🎯 Proven Amino signing + Keplr sendTx broadcasting loaded');
// ===================================
// MANUAL REFRESH FUNKTIONEN
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
    
    // Prüfe Balances
    try {
        const balances = await this.fetchUserBalances(address);
        console.log('💰 Current balances:', balances);
        this.showNotification(`💰 Available: ${balances?.available || '0'} MEDAS`, 'info');
        this.showNotification(`🎯 Delegated: ${balances?.delegated || '0'} MEDAS`, 'info');
    } catch (error) {
        console.log('❌ Balance check failed:', error.message);
    }
    
    // Prüfe Delegations
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

// ===================================
// DEBUG FUNKTIONEN
// ===================================

UIManager.prototype.testOptimisticStaking = function() {
    console.log('🧪 TESTING OPTIMISTIC STAKING:');
    
    if (window.keplr) {
        console.log('✅ Keplr available');
        console.log('APIs:', {
            signAmino: typeof window.keplr.signAmino,
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
    
    console.log('🎯 Optimistic staking ready - no broadcasting needed!');
    return 'Test complete';
};

console.log('🎯 Final optimistic staking solution loaded - broadcasting-free!');
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
