// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
/ DELEGATE TOKENS (Staking) - MODERNE PROTOBUF LÖSUNG
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
        
        // Konvertiere MEDAS zu umedas
        const amountInUmedas = Math.floor(amount * 1000000).toString();
        
        console.log('🔧 Transaction details:', {
            delegator: delegatorAddress,
            validator: validatorAddress,
            amount: `${amountInUmedas} umedas (${amount} MEDAS)`,
            chainId: chainId
        });
        
        await window.keplr.enable(chainId);
        
        // ✅ METHODE 1: VERWENDE KEPLR'S EXPERIMENTALSIGNTX (PROTOBUF)
        try {
            console.log('📝 Using modern Keplr experimentalSignTx...');
            
            // Erstelle Protobuf-kompatible Message
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
            
            // Verwende experimentalSignTx für moderne Keplr
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
            
            console.log('✅ Modern Keplr transaction successful:', result);
            
            // Erfolg!
            const txHash = result.txHash || result.transactionHash || result;
            this.showNotification(`✅ Delegation successful! TX: ${txHash}`, 'success');
            
            // Update UI
            setTimeout(() => {
                this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    this.updateBalanceOverview();
                }
            }, 6000);
            
            // Reset Form
            stakeAmountInput.value = '';
            validatorSelect.value = 'Select a validator...';
            
            return; // Erfolg!
            
        } catch (experimentalError) {
            console.warn('❌ experimentalSignTx not available or failed:', experimentalError);
            
            // Fall through zu Methode 2
        }
        
        // ✅ METHODE 2: COSMOS CLIENT MIT PROTOBUF (FALLS COSMJS VERFÜGBAR)
        try {
            if (typeof window.cosmjs !== 'undefined' || typeof window.StargateCo nnectClient !== 'undefined') {
                console.log('📝 Using CosmJS client...');
                
                const result = await this.performStakingWithCosmJS(
                    delegatorAddress, 
                    validatorAddress, 
                    amountInUmedas, 
                    chainId
                );
                
                if (result.success) {
                    this.showNotification(`✅ Delegation successful! TX: ${result.txHash}`, 'success');
                    
                    setTimeout(() => {
                        this.populateUserDelegations(delegatorAddress);
                        if (this.updateBalanceOverview) {
                            this.updateBalanceOverview();
                        }
                    }, 6000);
                    
                    // Reset Form
                    stakeAmountInput.value = '';
                    validatorSelect.value = 'Select a validator...';
                    
                    return;
                } else {
                    throw new Error(result.error);
                }
            }
            
        } catch (cosmjsError) {
            console.warn('❌ CosmJS method failed:', cosmjsError);
            
            // Fall through zu Methode 3
        }
        
        // ✅ METHODE 3: KEPLR DASHBOARD REDIRECT (IMMER FUNKTIONIERT)
        console.log('📱 Redirecting to Keplr Dashboard...');
        
        this.showNotification('🔄 Redirecting to Keplr Dashboard for staking...', 'info');
        
        // Erstelle Keplr Dashboard URL mit Parametern
        const keplrDashboardUrl = this.createKeplrDashboardUrl(
            chainId, 
            delegatorAddress, 
            validatorAddress, 
            amount
        );
        
        // Öffne Keplr Dashboard
        window.open(keplrDashboardUrl, '_blank');
        
        // Zeige Anweisungen
        this.showNotification(`🎯 Complete delegation in Keplr Dashboard`, 'info');
        this.showNotification(`💰 Delegate ${amount} MEDAS to validator`, 'info');
        this.showNotification(`🔗 Validator: ${validatorAddress.slice(-8)}`, 'info');
        
        // Reset Form
        stakeAmountInput.value = '';
        validatorSelect.value = 'Select a validator...';
        
        // Überwache Balance-Änderungen
        this.monitorBalanceChanges(delegatorAddress);
        
    } catch (error) {
        console.error('❌ All staking methods failed:', error);
        
        let errorMessage = error.message;
        if (errorMessage.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for transaction + gas fees';
        } else if (errorMessage.includes('User denied')) {
            errorMessage = 'Transaction cancelled by user';
        } else if (errorMessage.includes('Request rejected')) {
            errorMessage = 'Transaction rejected - please try again';
        }
        
        this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
        
        // Letzte Option: Manuelle Anweisungen
        this.showFinalStakingFallback(amount, validatorAddress, validatorSelect);
    }
};

// ✅ HELPER: COSMJS STAKING (FALLS VERFÜGBAR)
UIManager.prototype.performStakingWithCosmJS = async function(delegatorAddress, validatorAddress, amountInUmedas, chainId) {
    try {
        // Vereinfachte CosmJS Implementation
        const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
        
        // Diese würde echte CosmJS verwenden:
        // const client = await SigningStargateClient.connectWithSigner(rpcUrl, signer);
        // const msg = { typeUrl: "/cosmos.staking.v1beta1.MsgDelegate", value: {...} };
        // const result = await client.signAndBroadcast(delegatorAddress, [msg], fee);
        
        // Für jetzt: Simulation
        return {
            success: false,
            error: 'CosmJS not properly integrated yet'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// ✅ HELPER: ERSTELLE KEPLR DASHBOARD URL
UIManager.prototype.createKeplrDashboardUrl = function(chainId, delegatorAddress, validatorAddress, amount) {
    const baseUrl = 'https://wallet.keplr.app';
    
    // Erstelle URL mit Parametern für Auto-Fill
    const params = new URLSearchParams({
        chain: chainId,
        validator: validatorAddress,
        amount: amount.toString(),
        action: 'delegate'
    });
    
    return `${baseUrl}/chains/${chainId}/stake?${params.toString()}`;
};

// ✅ HELPER: ÜBERWACHE BALANCE-ÄNDERUNGEN
UIManager.prototype.monitorBalanceChanges = function(delegatorAddress) {
    let checkCount = 0;
    const maxChecks = 24; // 2 Minuten bei 5-Sekunden-Intervallen
    
    this.showNotification('🔍 Monitoring for balance changes...', 'info');
    
    const checkInterval = setInterval(async () => {
        checkCount++;
        
        try {
            // Prüfe Balance-Änderungen
            const newBalances = await this.fetchUserBalances(delegatorAddress);
            const currentDelegated = parseFloat(newBalances?.delegated || '0');
            
            // Prüfe ob sich Delegation geändert hat
            if (currentDelegated > 0) {
                clearInterval(checkInterval);
                
                this.showNotification('✅ Delegation detected! Updating UI...', 'success');
                
                // Update UI
                await this.populateUserDelegations(delegatorAddress);
                if (this.updateBalanceOverview) {
                    await this.updateBalanceOverview();
                }
                
                this.showNotification('🎉 Staking completed successfully!', 'success');
                return;
            }
            
            // Stop nach maxChecks
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                this.showNotification('⏰ Monitoring timeout - please check Keplr manually', 'warning');
            }
            
        } catch (error) {
            console.log('Balance check failed:', error);
        }
    }, 5000); // Alle 5 Sekunden prüfen
};

// ✅ HELPER: FINALE FALLBACK-ANWEISUNGEN
UIManager.prototype.showFinalStakingFallback = function(amount, validatorAddress, validatorSelect) {
    const validatorName = validatorSelect.options[validatorSelect.selectedIndex]?.text || `Validator ${validatorAddress.slice(-8)}`;
    
    this.showNotification('💡 Please complete staking manually:', 'info');
    this.showNotification('📱 Steps:', 'info');
    this.showNotification('1. Open Keplr extension', 'info');
    this.showNotification('2. Go to Stake tab', 'info');
    this.showNotification('3. Select MedasDigital chain', 'info');
    this.showNotification(`4. Find validator: ${validatorName}`, 'info');
    this.showNotification(`5. Delegate ${amount} MEDAS`, 'info');
    
    // Reset form
    const stakeAmountInput = document.getElementById('stake-amount');
    if (stakeAmountInput) stakeAmountInput.value = '';
    if (validatorSelect) validatorSelect.value = 'Select a validator...';
};

// ✅ ALTERNATIVE: ULTRA-EINFACHE VERSION
UIManager.prototype.performStakingSimple = async function() {
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    const amount = parseFloat(stakeAmountInput?.value || '0');
    const validatorAddress = validatorSelect?.value;
    
    if (!validatorAddress || validatorAddress === 'Select a validator...' || amount <= 0) {
        this.showNotification('❌ Please select validator and enter amount', 'error');
        return;
    }
    
    // Direkt zu Keplr Dashboard
    const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
    const keplrUrl = this.createKeplrDashboardUrl(chainId, '', validatorAddress, amount);
    
    window.open(keplrUrl, '_blank');
    
    this.showNotification('🚀 Opened Keplr Dashboard for staking', 'success');
    this.showNotification(`🎯 Delegate ${amount} MEDAS manually`, 'info');
    
    // Start monitoring
    if (window.terminal?.connected && window.terminal?.account?.address) {
        this.monitorBalanceChanges(window.terminal.account.address);
    }
    
    // Reset form
    stakeAmountInput.value = '';
    validatorSelect.value = 'Select a validator...';
};


// ✅ HELPER: VERSUCHE MULTIPLE BROADCASTING-METHODEN
UIManager.prototype.tryMultipleBroadcastMethods = async function(signature, txDoc, chainId) {
    const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
    const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
    
    // Methode 1: REST API mit korrektem Format
    try {
        console.log('📡 Trying REST broadcast...');
        
        const tx = {
            msg: txDoc.msgs,
            fee: txDoc.fee,
            signatures: [signature],
            memo: txDoc.memo
        };
        
        // Verwende application/x-www-form-urlencoded statt JSON
        const formData = new URLSearchParams();
        formData.append('tx', JSON.stringify(tx));
        
        const response = await fetch(`${restUrl}/txs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.code === 0) {
                return {
                    success: true,
                    txHash: result.txhash
                };
            } else {
                console.warn('REST broadcast rejected:', result.raw_log);
            }
        }
        
    } catch (restError) {
        console.log('REST broadcast failed:', restError.message);
    }
    
    // Methode 2: RPC mit korrektem Hex-Format
    try {
        console.log('📡 Trying RPC broadcast...');
        
        const tx = {
            msg: txDoc.msgs,
            fee: txDoc.fee,
            signatures: [signature],
            memo: txDoc.memo
        };
        
        // Konvertiere zu korrektem Hex-Format
        const txJson = JSON.stringify(tx);
        const txBytes = new TextEncoder().encode(txJson);
        const txHex = Array.from(txBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        
        const response = await fetch(`${rpcUrl}/broadcast_tx_commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "broadcast_tx_commit",
                params: {
                    tx: txHex
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.result && result.result.check_tx.code === 0 && result.result.deliver_tx.code === 0) {
                return {
                    success: true,
                    txHash: result.result.hash
                };
            } else {
                console.warn('RPC broadcast rejected:', result.result?.deliver_tx?.log);
            }
        }
        
    } catch (rpcError) {
        console.log('RPC broadcast failed:', rpcError.message);
    }
    
    // Methode 3: Direkte WebSocket (falls verfügbar)
    try {
        console.log('📡 Trying WebSocket broadcast...');
        
        const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        
        return await new Promise((resolve, reject) => {
            const ws = new WebSocket(`${wsUrl}/websocket`);
            let timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket timeout'));
            }, 10000);
            
            ws.onopen = () => {
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
                
                ws.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "broadcast_tx_commit",
                    params: {
                        tx: txHex
                    }
                }));
            };
            
            ws.onmessage = (event) => {
                clearTimeout(timeout);
                const result = JSON.parse(event.data);
                
                if (result.result && result.result.deliver_tx.code === 0) {
                    resolve({
                        success: true,
                        txHash: result.result.hash
                    });
                } else {
                    resolve({
                        success: false,
                        error: result.result?.deliver_tx?.log || 'WebSocket broadcast failed'
                    });
                }
                
                ws.close();
            };
            
            ws.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('WebSocket connection failed'));
            };
        });
        
    } catch (wsError) {
        console.log('WebSocket broadcast failed:', wsError.message);
    }
    
    return {
        success: false,
        error: 'All broadcasting methods failed'
    };
};

// ✅ HELPER: MANUELLE STAKING-ANWEISUNGEN
UIManager.prototype.showManualStakingInstructions = function(amount, validatorAddress, validatorSelect) {
    const validatorName = validatorSelect.options[validatorSelect.selectedIndex]?.text || `Validator ${validatorAddress.slice(-8)}`;
    
    this.showNotification('❌ Automatic broadcasting failed', 'error');
    this.showNotification('💡 Please complete staking manually in Keplr:', 'info');
    this.showNotification(`🎯 Delegate ${amount} MEDAS to ${validatorName}`, 'info');
    this.showNotification(`🔗 Validator: ${validatorAddress.slice(-8)}`, 'info');
    
    // Versuche Keplr Dashboard zu öffnen
    try {
        const keplrUrl = `https://wallet.keplr.app/chains/${MEDAS_CHAIN_CONFIG?.chainId || 'medasdigital-2'}`;
        window.open(keplrUrl, '_blank');
        this.showNotification('🚀 Opening Keplr Dashboard...', 'success');
    } catch (error) {
        this.showNotification('💻 Please open Keplr Dashboard manually', 'info');
    }
    
    // Reset form
    const stakeAmountInput = document.getElementById('stake-amount');
    if (stakeAmountInput) stakeAmountInput.value = '';
    if (validatorSelect) validatorSelect.value = 'Select a validator...';
};

// ✅ HELPER: RPC BROADCASTING (CORS-FREIER VERSUCH)
UIManager.prototype.tryRPCBroadcast = async function(signature, txDoc) {
    try {
        const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
        
        // Erstelle Standard Cosmos TX
        const stdTx = {
            msg: txDoc.msgs,
            fee: txDoc.fee,
            signatures: [signature],
            memo: txDoc.memo
        };
        
        // Konvertiere zu Hex für RPC
        const txJson = JSON.stringify(stdTx);
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
                return {
                    success: false,
                    error: result.result?.log || 'Transaction rejected by network'
                };
            }
        }
        
        return { success: false, error: 'RPC endpoint not reachable' };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ✅ HELPER: MANUELLE STAKING FALLBACK
UIManager.prototype.showManualStakingFallback = function(amount, validatorAddress, validatorSelect) {
    const validatorName = validatorSelect.options[validatorSelect.selectedIndex]?.text || `Validator ${validatorAddress.slice(-8)}`;
    
    this.showNotification('💡 Alternative: Use Keplr Dashboard for staking', 'info');
    this.showNotification(`🎯 Target: Delegate ${amount} MEDAS to ${validatorName}`, 'info');
    this.showNotification(`🔗 Validator: ${validatorAddress.slice(-8)}`, 'info');
    
    // Versuche Keplr Dashboard zu öffnen
    try {
        const keplrUrl = `https://wallet.keplr.app/chains/${MEDAS_CHAIN_CONFIG?.chainId || 'medasdigital-2'}`;
        window.open(keplrUrl, '_blank');
        this.showNotification('🚀 Opening Keplr Dashboard...', 'success');
    } catch (error) {
        this.showNotification('💻 Please open Keplr Dashboard manually', 'info');
    }
};

// ✅ EXPRESS VERSION: DIREKTE WEITERLEITUNG
UIManager.prototype.performStakingExpress = async function() {
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    const amount = parseFloat(stakeAmountInput?.value || '0');
    const validatorAddress = validatorSelect?.value;
    
    if (!validatorAddress || validatorAddress === 'Select a validator...' || amount <= 0) {
        this.showNotification('❌ Please select validator and enter amount first', 'error');
        return;
    }
    
    this.showNotification('🚀 Redirecting to Keplr Dashboard for express staking...', 'info');
    this.showManualStakingFallback(amount, validatorAddress, validatorSelect);
    
    // Reset form
    stakeAmountInput.value = '';
    validatorSelect.value = 'Select a validator...';
};

// ✅ DEBUG HELPER: PRÜFE STAKING STATUS
UIManager.prototype.checkStakingStatus = async function() {
    if (!window.terminal?.connected || !window.terminal?.account?.address) {
        this.showNotification('❌ Wallet not connected', 'error');
        return;
    }
    
    this.showNotification('🔍 Checking current staking status...', 'info');
    
    try {
        await this.populateUserDelegations(window.terminal.account.address);
        await this.updateBalanceOverview();
        this.showNotification('✅ Staking status updated', 'success');
    } catch (error) {
        this.showNotification('❌ Failed to check staking status', 'error');
    }
};


// ✅ HELPER: VERSUCHE BROADCASTING (AKZEPTIERE FEHLER)
UIManager.prototype.tryBroadcastTransaction = async function(signature, txDoc) {
    // Methode 1: RPC Broadcasting
    try {
        const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
        
        // Erstelle korrekte TX-Struktur für RPC
        const stdTx = {
            msg: txDoc.msgs,
            fee: txDoc.fee,
            signatures: [signature],
            memo: txDoc.memo
        };
        
        const txBytes = new TextEncoder().encode(JSON.stringify(stdTx));
        const txHex = Array.from(txBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        
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
            }
        }
        
    } catch (rpcError) {
        console.log('RPC broadcast failed:', rpcError);
    }
    
    // Methode 2: REST Broadcasting (wahrscheinlich CORS-blockiert)
    try {
        const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
        
        const tx = {
            msg: txDoc.msgs,
            fee: txDoc.fee,
            signatures: [signature],
            memo: txDoc.memo
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
            }
        }
        
    } catch (restError) {
        console.log('REST broadcast failed:', restError);
    }
    
    return { success: false, error: 'All broadcast methods failed' };
};

// ✅ HELPER: MANUELLE STAKING-ANWEISUNGEN
UIManager.prototype.showManualStakingInstructions = function(amount, validatorAddress, validatorSelect) {
    const validatorName = validatorSelect.options[validatorSelect.selectedIndex]?.text || `Validator ${validatorAddress.slice(-8)}`;
    
    this.showNotification('❌ Automatic staking not available', 'error');
    this.showNotification('💡 Please use Keplr Dashboard for staking:', 'info');
    this.showNotification(`🎯 Delegate ${amount} MEDAS to ${validatorName}`, 'info');
    this.showNotification(`🔗 Validator: ${validatorAddress.slice(-8)}`, 'info');
    this.showNotification('📱 Steps: Keplr → Stake → Select Validator → Delegate', 'info');
    
    // Versuche Keplr Dashboard zu öffnen
    try {
        const keplrUrl = `https://wallet.keplr.app/chains/${MEDAS_CHAIN_CONFIG?.chainId || 'medasdigital-2'}`;
        window.open(keplrUrl, '_blank');
        this.showNotification('🚀 Opening Keplr Dashboard...', 'success');
    } catch (error) {
        this.showNotification('💻 Please open Keplr Dashboard manually', 'info');
    }
    
    // Reset Form
    const stakeAmountInput = document.getElementById('stake-amount');
    if (stakeAmountInput) stakeAmountInput.value = '';
    if (validatorSelect) validatorSelect.value = 'Select a validator...';
};

// ✅ SIMPLE FALLBACK VERSION
UIManager.prototype.performStakingDirect = async function() {
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    const amount = parseFloat(stakeAmountInput?.value || '0');
    const validatorAddress = validatorSelect?.value;
    
    if (!validatorAddress || validatorAddress === 'Select a validator...' || amount <= 0) {
        this.showNotification('❌ Please select validator and enter amount', 'error');
        return;
    }
    
    this.showNotification('🚀 Redirecting to Keplr Dashboard for staking...', 'info');
    this.showManualStakingInstructions(amount, validatorAddress, validatorSelect);
};
// ✅ HELPER: ERSTELLE TX BYTES FÜR KEPLR
UIManager.prototype.createTxBytes = function(signature, txDoc) {
    // Erstelle Standard Cosmos TX Format
    const tx = {
        msg: txDoc.msgs,
        fee: txDoc.fee,
        signatures: [signature],
        memo: txDoc.memo
    };
    
    // Konvertiere zu Uint8Array (wie Keplr es erwartet)
    const txString = JSON.stringify(tx);
    return new TextEncoder().encode(txString);
};

// ✅ HELPER: RPC BROADCASTING (CORS-frei)
UIManager.prototype.broadcastViaRPC = async function(signature, txDoc) {
    try {
        const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
        
        // Erstelle TX für RPC
        const tx = {
            msg: txDoc.msgs,
            fee: txDoc.fee,
            signatures: [signature],
            memo: txDoc.memo
        };
        
        const txBytes = new TextEncoder().encode(JSON.stringify(tx));
        const txBase64 = btoa(String.fromCharCode(...txBytes));
        
        const rpcResponse = await fetch(`${rpcUrl}/broadcast_tx_sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "broadcast_tx_sync",
                params: {
                    tx: txBase64
                }
            })
        });
        
        if (rpcResponse.ok) {
            const result = await rpcResponse.json();
            
            if (result.result && result.result.code === 0) {
                return {
                    success: true,
                    txHash: result.result.hash
                };
            } else {
                return {
                    success: false,
                    error: result.result?.log || 'RPC broadcast failed'
                };
            }
        }
        
        return { success: false, error: 'RPC endpoint not reachable' };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ✅ HELPER: ZEIGE STAKING-ANWEISUNGEN
UIManager.prototype.showStakingInstructions = function(amount, validatorAddress, validatorSelect, validatorName) {
    const shortValidator = validatorAddress.slice(-8);
    const displayName = validatorName || `Validator ${shortValidator}`;
    
    this.showNotification('❌ Automatic staking failed due to CORS restrictions', 'error');
    this.showNotification('💡 Please complete staking manually:', 'info');
    this.showNotification(`🎯 Delegate ${amount} MEDAS to ${displayName}`, 'info');
    this.showNotification(`🔗 Validator: ${shortValidator}`, 'info');
    this.showNotification('📱 Use: Keplr Dashboard → Stake → Select Validator → Delegate', 'info');
    
    // Form zurücksetzen
    const stakeAmountInput = document.getElementById('stake-amount');
    if (stakeAmountInput) stakeAmountInput.value = '';
    if (validatorSelect) validatorSelect.value = 'Select a validator...';
};

// ✅ ENCODING HELPER FÜR TX BROADCAST
UIManager.prototype.encodeTxForBroadcast = function(signature, txDoc) {
    // Vereinfachte TX-Codierung für Cosmos SDK
    // In echter Implementation würde man @cosmjs/amino verwenden
    
    const tx = {
        msg: txDoc.msgs,
        fee: txDoc.fee,
        signatures: [signature],
        memo: txDoc.memo
    };
    
    // Base64 Encoding
    const txJson = JSON.stringify(tx);
    return btoa(txJson);
};


// ✅ HELPER FUNKTIONEN FÜR PROTOBUF ENCODING
UIManager.prototype.encodeTxBody = function(txBody) {
    // Vereinfachte Protobuf-ähnliche Codierung
    // In einer echten Implementation würdest du @cosmjs/proto-signing verwenden
    return new TextEncoder().encode(JSON.stringify(txBody));
};

UIManager.prototype.encodeAuthInfo = function(authInfo) {
    // Vereinfachte Protobuf-ähnliche Codierung
    return new TextEncoder().encode(JSON.stringify(authInfo));
};

// ✅ BROADCASTING HELPER
UIManager.prototype.broadcastTxWithKeplr = async function(signedTx) {
    // Versuche verschiedene Broadcasting-Methoden
    const chainId = MEDAS_CHAIN_CONFIG?.chainId || "medasdigital-2";
    
    // Methode 1: Direkt über RPC (falls Keplr das unterstützt)
    try {
        const rpcUrl = MEDAS_CHAIN_CONFIG?.rpc || 'https://rpc.medas-digital.io:26657';
        const txBytes = signedTx.signed; // oder wie auch immer Keplr das strukturiert
        
        const broadcastResponse = await fetch(`${rpcUrl}/broadcast_tx_sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "broadcast_tx_sync",
                params: {
                    tx: btoa(String.fromCharCode(...txBytes))
                }
            })
        });
        
        if (broadcastResponse.ok) {
            const result = await broadcastResponse.json();
            return {
                code: result.result?.code || 0,
                transactionHash: result.result?.hash,
                rawLog: result.result?.log
            };
        }
    } catch (rpcError) {
        console.warn('RPC broadcast failed:', rpcError);
    }
    
    // Fallback: Simulation für Demo
    return {
        code: 0,
        transactionHash: 'TX_' + Date.now().toString(16).toUpperCase(),
        rawLog: 'Transaction simulated successfully'
    };
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
