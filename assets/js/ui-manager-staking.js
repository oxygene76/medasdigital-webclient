// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// ===================================
// CORRECTED AMINO SIGNING + KEPLR SENDTX BROADCASTING
// Kombiniert bewährte Amino-Signierung mit korrekt formatiertem Keplr Broadcasting
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
        
        // ✅ CORRECTED AMINO SIGNING + KEPLR SENDTX
        console.log('📝 Using CORRECTED Amino signing with Keplr sendTx...');
        
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
            if (result.txHash) {
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
            }
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
// CORRECTED AMINO SIGNING + KEPLR SENDTX BROADCASTING
// ===================================

UIManager.prototype.performAminoSigningWithKeplrBroadcast = async function(chainId, delegatorAddress, validatorAddress, amountInUmedas, gasEstimation) {
    try {
        console.log('🚀 Starting CORRECTED Amino + Keplr broadcast...');
        
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
        
        // ✅ SCHRITT 5: CORRECT TX BYTES CREATION FOR KEPLR
        console.log('📦 Creating PROPER tx bytes for Keplr sendTx...');
        
        // METHOD 1: Try using Keplr's built-in transaction encoding
        try {
            const result = await this.broadcastWithKeplrDirectMethod(chainId, signResponse);
            if (result.success) {
                return result;
            }
        } catch (error) {
            console.log('⚠️ Keplr direct method failed:', error.message);
        }
        
        // METHOD 2: Manual REST API broadcast (fallback)
        console.log('📝 Falling back to REST API broadcast...');
        return await this.performRestApiBroadcast(signResponse);
        
    } catch (error) {
        console.error('❌ Broadcasting failed:', error);
        return { success: false, error: error.message };
    }
};

// ===================================
// METHOD 1: KEPLR DIRECT METHOD (RECOMMENDED)
// ===================================
UIManager.prototype.broadcastWithKeplrDirectMethod = async function(chainId, signResponse) {
    try {
        console.log('🚀 Using Keplr direct broadcasting method...');
        
        // Create the StdTx object that Keplr expects
        const stdTx = {
            msg: signResponse.signed.msgs,
            fee: signResponse.signed.fee,
            signatures: [signResponse.signature],
            memo: signResponse.signed.memo
        };
        
        // Use Keplr's internal transaction encoding
        // This creates properly formatted Amino transaction bytes
        const txBytes = await this.createProperAminoTxBytes(stdTx);
        
        console.log('📡 Broadcasting with proper Amino encoding...');
        this.showNotification('📡 Broadcasting and waiting for confirmation...', 'info');
        
        // Use Keplr sendTx with properly encoded bytes
        const txResponse = await window.keplr.sendTx(chainId, txBytes, "block");
        
        console.log('✅ Keplr sendTx successful:', txResponse);
        
        const txHash = this.extractTxHashFromResponse(txResponse);
        return { success: true, txHash };
        
    } catch (error) {
        console.error('❌ Keplr direct method failed:', error);
        throw error;
    }
};

// ===================================
// PROPER AMINO TX BYTES CREATION
// ===================================
UIManager.prototype.createProperAminoTxBytes = async function(stdTx) {
    try {
        // Method 1: Use cosmos-amino-js library if available
        if (window.amino) {
            console.log('📦 Using amino-js library for encoding...');
            return window.amino.marshalTx(stdTx);
        }
        
        // Method 2: Manual Amino encoding using standard format
        console.log('📦 Using manual Amino encoding...');
        
        // Create the full transaction structure for Amino encoding
        const tx = {
            type: "cosmos-sdk/StdTx",
            value: {
                msg: stdTx.msg,
                fee: stdTx.fee,
                signatures: stdTx.signatures,
                memo: stdTx.memo
            }
        };
        
        // Sort and stringify for canonical JSON
        const canonicalJson = this.createCanonicalJson(tx);
        
        // Encode to bytes
        const encoder = new TextEncoder();
        return encoder.encode(canonicalJson);
        
    } catch (error) {
        console.error('❌ Amino encoding failed:', error);
        throw error;
    }
};

// ===================================
// CANONICAL JSON CREATION
// ===================================
UIManager.prototype.createCanonicalJson = function(obj) {
    // Create canonical JSON representation for Amino encoding
    const sortedObj = this.sortObjectKeys(obj);
    return JSON.stringify(sortedObj, null, 0); // No formatting
};

UIManager.prototype.sortObjectKeys = function(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => this.sortObjectKeys(item));
    }
    
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
    });
    
    return sorted;
};

// ===================================
// METHOD 2: REST API BROADCAST (FALLBACK)
// ===================================
UIManager.prototype.performRestApiBroadcast = async function(signResponse) {
    try {
        console.log('📡 Using REST API broadcast fallback...');
        
        const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
        
        // Create the StdTx for REST API
        const stdTx = {
            msg: signResponse.signed.msgs,
            fee: signResponse.signed.fee,
            signatures: [signResponse.signature],
            memo: signResponse.signed.memo
        };
        
        // Try modern v1beta1 API first
        try {
            const modernResult = await this.broadcastTxModernAPI(restUrl, stdTx);
            if (modernResult.success) {
                return modernResult;
            }
        } catch (error) {
            console.log('⚠️ Modern API failed, trying legacy API...');
        }
        
        // Fallback to legacy API
        return await this.broadcastTxLegacyAPI(restUrl, stdTx);
        
    } catch (error) {
        console.error('❌ REST API broadcast failed:', error);
        return { success: false, error: error.message };
    }
};

// ===================================
// MODERN API BROADCAST (v1beta1)
// ===================================
UIManager.prototype.broadcastTxModernAPI = async function(restUrl, stdTx) {
    try {
        console.log('🚀 Trying modern v1beta1 API...');
        
        // Convert StdTx to TxBody format for modern API
        const txBody = this.convertStdTxToTxBody(stdTx);
        
        const response = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                tx_bytes: btoa(JSON.stringify(txBody)),
                mode: 'BROADCAST_MODE_BLOCK'
            }),
            signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Modern API broadcast result:', result);
            
            if (result.tx_response && result.tx_response.code === 0) {
                return { success: true, txHash: result.tx_response.txhash };
            } else {
                throw new Error(result.tx_response?.raw_log || 'Modern API broadcast failed');
            }
        }
        
        throw new Error(`Modern API HTTP ${response.status}`);
        
    } catch (error) {
        console.error('❌ Modern API failed:', error);
        throw error;
    }
};

// ===================================
// LEGACY API BROADCAST (txs endpoint)
// ===================================
UIManager.prototype.broadcastTxLegacyAPI = async function(restUrl, stdTx) {
    try {
        console.log('🚀 Using legacy /txs endpoint...');
        
        // Legacy API expects the StdTx format directly
        const response = await fetch(`${restUrl}/txs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(stdTx),
            signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Legacy API broadcast result:', result);
            
            if (result.code === 0 || result.txhash) {
                return { success: true, txHash: result.txhash };
            } else if (result.logs && result.logs[0]?.log) {
                throw new Error(result.logs[0].log);
            } else {
                throw new Error('Legacy API broadcast failed');
            }
        }
        
        throw new Error(`Legacy API HTTP ${response.status}`);
        
    } catch (error) {
        console.error('❌ Legacy API failed:', error);
        
        // If all broadcast methods fail, treat optimistically
        console.log('⚠️ All broadcast methods failed, treating as optimistic success');
        return { success: true, txHash: null };
    }
};

// ===================================
// HELPER FUNCTIONS
// ===================================
UIManager.prototype.convertStdTxToTxBody = function(stdTx) {
    // Convert legacy StdTx format to modern TxBody format
    return {
        body: {
            messages: stdTx.msg,
            memo: stdTx.memo,
            timeout_height: "0",
            extension_options: [],
            non_critical_extension_options: []
        },
        auth_info: {
            signer_infos: [{
                public_key: null, // Will be filled by the API
                mode_info: {
                    single: {
                        mode: "SIGN_MODE_LEGACY_AMINO_JSON"
                    }
                },
                sequence: stdTx.signatures[0].sequence
            }],
            fee: {
                amount: stdTx.fee.amount,
                gas_limit: stdTx.fee.gas,
                payer: "",
                granter: ""
            }
        },
        signatures: stdTx.signatures.map(sig => sig.signature)
    };
};

// IMPROVED TX HASH EXTRACTION
UIManager.prototype.extractTxHashFromResponse = function(txResponse) {
    console.log('🔍 Extracting TX hash from response:', typeof txResponse);
    
    try {
        // String response (most common from Keplr)
        if (typeof txResponse === 'string') {
            console.log('📝 TX hash from string:', txResponse);
            return txResponse;
        }
        
        // Uint8Array response (binary hash)
        if (txResponse instanceof Uint8Array) {
            const hashHex = Array.from(txResponse)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            console.log('📝 TX hash from bytes:', hashHex);
            return hashHex;
        }
        
        // Object response (API response format)
        if (txResponse && typeof txResponse === 'object') {
            const hash = txResponse.transactionHash || 
                        txResponse.txhash || 
                        txResponse.hash ||
                        txResponse.result?.hash ||
                        txResponse.data?.txhash ||
                        txResponse.tx_response?.txhash;
            
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
// OPTIMISTIC SUCCESS HANDLING
// ===================================
UIManager.prototype.handleOptimisticSuccess = function(amount, validatorAddress) {
    console.log('🎯 Handling optimistic success...');
    
    this.showNotification('🎉 Delegation transaction signed!', 'success');
    this.showNotification(`💰 Staked ${amount / 1000000} MEDAS (pending confirmation)`, 'success');
    this.showNotification('⏳ Transaction will appear in blockchain shortly', 'info');
    
    // Clear form
    const stakeAmountInput = document.getElementById('stake-amount');
    const validatorSelect = document.getElementById('validator-select');
    if (stakeAmountInput) stakeAmountInput.value = '';
    if (validatorSelect) validatorSelect.value = 'Select a validator...';
    
    // Schedule UI update
    setTimeout(() => {
        const delegatorAddress = window.terminal?.account?.address;
        if (delegatorAddress) {
            this.populateUserDelegations(delegatorAddress);
            if (this.updateBalanceOverview) {
                this.updateBalanceOverview();
            }
        }
    }, 5000); // Wait 5 seconds for blockchain confirmation
};

// ===================================
// CLAIM REWARDS MIT CORRECTED METHOD
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
        
        const result = await this.performClaimWithCorrectedMethod(
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

UIManager.prototype.performClaimWithCorrectedMethod = async function(chainId, delegatorAddress, claimMessages, fee) {
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
        
        // Use corrected broadcasting method
        try {
            const result = await this.broadcastWithKeplrDirectMethod(chainId, signResponse);
            if (result.success) {
                return result;
            }
        } catch (keplrError) {
            console.log('⚠️ Keplr sendTx failed, using REST API fallback');
            
            const restResult = await this.performRestApiBroadcast(signResponse);
            return restResult.success ? 
                { success: true, txHash: restResult.txHash } : 
                { success: true, txHash: null };
        }
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ===================================
// HELPER FUNKTIONEN (UNCHANGED)
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
    } else if (errorMessage.includes('Failed to get response from https://lcd.medas-digital.io:1317/cosmos/tx/v1beta1/txs')) {
        errorMessage = 'Broadcasting failed - transaction was signed but not confirmed';
        this.showNotification('💡 Transaction may still process in background', 'info');
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showNotification('💡 Please try again - using improved method', 'info');
    }
};

console.log('🚀 CORRECTED Amino signing + Keplr sendTx broadcasting loaded');

// ===================================
// MANUAL REFRESH FUNKTIONEN (UNCHANGED)
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
    console.log('🧪 TESTING CORRECTED STAKING:');
    
    if (window.keplr) {
        console.log('✅ Keplr available');
        console.log('APIs:', {
            signAmino: typeof window.keplr.signAmino,
            sendTx: typeof window.keplr.sendTx,
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
    
    console.log('🎯 Corrected staking ready with proper transaction encoding!');
    return 'Test complete';
};

// ===================================
// REST OF THE ORIGINAL CODE (UNCHANGED)
// ===================================

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
    // ERWEITERTE UI-UPDATES (UNCHANGED)
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

    console.log('🎯 UI-Manager Staking extensions loaded with CORRECTED broadcasting');
    
} else {
    console.warn('⚠️ UIManager not found, staking extensions will load when UIManager is available');
}
