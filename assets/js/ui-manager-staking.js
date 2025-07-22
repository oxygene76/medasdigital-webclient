// ===================================
// UI-MANAGER-STAKING.JS
// Staking-spezifische UI-Manager Erweiterungen
// Diese Funktionen erweitern die UIManager Klasse
// ===================================

// Erweitere UIManager um Staking-Funktionen
if (typeof UIManager !== 'undefined' && UIManager.prototype) {
    
// STAKING MIT KEPLR GAS-ESTIMATION
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
        
        // ✅ SCHRITT 1: GAS ESTIMATION
        console.log('⛽ Estimating gas requirements...');
        
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
        
        const estimatedGas = await this.estimateGasWithKeplr(chainId, delegatorAddress, msgs);
        console.log('⛽ Gas estimation result:', estimatedGas);
        
        // ✅ METHODE 1: DIRECT MODE MIT GESCHÄTZTEM GAS
        try {
            console.log('📝 Using DIRECT mode with estimated gas...');
            
            const result = await window.keplr.sendTx(
                chainId,
                msgs,
                estimatedGas.fee,
                "", // memo
                "direct"
            );
            
            console.log('✅ Direct mode sendTx successful:', result);
            
            if (result && (result.code === 0 || result.transactionHash || typeof result === 'string')) {
                const txHash = result.transactionHash || result.txhash || result;
                this.showNotification(`✅ Delegation successful! TX: ${txHash}`, 'success');
                this.showNotification(`⛽ Gas used: ${estimatedGas.gasUsed} (estimated: ${estimatedGas.gasEstimate})`, 'info');
                
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
            } else {
                throw new Error(result?.log || result?.rawLog || 'Direct mode failed');
            }
            
        } catch (directModeError) {
            console.warn('❌ Direct mode failed:', directModeError);
        }
        
        // ✅ METHODE 2: EXPERIMENTALSIGNTX MIT GESCHÄTZTEM GAS
        try {
            if (window.keplr.experimentalSignTx) {
                console.log('📝 Using experimentalSignTx with estimated gas...');
                
                const result = await window.keplr.experimentalSignTx(
                    chainId,
                    delegatorAddress,
                    msgs,
                    estimatedGas.fee,
                    "", // memo
                    {
                        preferNoSetFee: false,
                        preferNoSetMemo: true,
                        disableBalanceCheck: false
                    }
                );
                
                console.log('✅ experimentalSignTx successful:', result);
                
                const txHash = result.txHash || result.transactionHash || result;
                this.showNotification(`✅ Delegation successful! TX: ${txHash}`, 'success');
                this.showNotification(`⛽ Gas estimated: ${estimatedGas.gasEstimate}`, 'info');
                
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
            }
            
        } catch (experimentalError) {
            console.warn('❌ experimentalSignTx failed:', experimentalError);
        }
        
        // ✅ METHODE 3: AMINO SIGNING MIT GESCHÄTZTEM GAS
        try {
            console.log('📝 Using Amino signing with estimated gas...');
            
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
                
                this.handleStakingSuccess(delegatorAddress, stakeAmountInput, validatorSelect);
                return;
            } else {
                throw new Error(aminoResult.error);
            }
            
        } catch (aminoError) {
            console.error('❌ Amino signing failed:', aminoError);
            throw aminoError;
        }
        
    } catch (error) {
        console.error('❌ All staking methods failed:', error);
        this.handleStakingError(error, amount, validatorAddress, validatorSelect);
    }
};

// ✅ GAS ESTIMATION MIT KEPLR
UIManager.prototype.estimateGasWithKeplr = async function(chainId, delegatorAddress, msgs) {
    try {
        // Methode 1: Keplr's simulateMultipleTx (falls verfügbar)
        if (window.keplr.simulateMultipleTx) {
            console.log('⛽ Using Keplr simulateMultipleTx...');
            
            const simulation = await window.keplr.simulateMultipleTx(chainId, msgs);
            const gasEstimate = Math.floor(simulation.gasUsed * 1.3); // 30% Buffer
            
            const gasPrice = await this.getGasPrice(chainId);
            const feeAmount = Math.floor(gasEstimate * gasPrice).toString();
            
            return {
                gasEstimate: gasEstimate,
                gasUsed: simulation.gasUsed,
                fee: {
                    amount: [{
                        denom: "umedas",
                        amount: feeAmount
                    }],
                    gas: gasEstimate.toString()
                }
            };
        }
        
        // Methode 2: Keplr's simulate (Standard)
        if (window.keplr.simulate) {
            console.log('⛽ Using Keplr simulate...');
            
            const simulation = await window.keplr.simulate(chainId, msgs[0]);
            const gasEstimate = Math.floor(simulation.gasUsed * 1.3); // 30% Buffer
            
            const gasPrice = await this.getGasPrice(chainId);
            const feeAmount = Math.floor(gasEstimate * gasPrice).toString();
            
            return {
                gasEstimate: gasEstimate,
                gasUsed: simulation.gasUsed,
                fee: {
                    amount: [{
                        denom: "umedas",
                        amount: feeAmount
                    }],
                    gas: gasEstimate.toString()
                }
            };
        }
        
        // Methode 3: Manuelle Simulation über REST API
        console.log('⛽ Using manual gas estimation...');
        return await this.estimateGasManually(chainId, delegatorAddress, msgs);
        
    } catch (estimationError) {
        console.warn('⛽ Gas estimation failed, using defaults:', estimationError);
        
        // Fallback: Bewährte Default-Werte
        return {
            gasEstimate: 250000,
            gasUsed: 200000,
            fee: {
                amount: [{
                    denom: "umedas",
                    amount: "6250" // 250000 * 0.025
                }],
                gas: "250000"
            }
        };
    }
};

// ✅ GAS PRICE ERMITTELN
UIManager.prototype.getGasPrice = async function(chainId) {
    try {
        // Hole Gas Price aus Chain Config oder API
        const chainConfig = MEDAS_CHAIN_CONFIG;
        
        if (chainConfig?.gas?.defaults?.gasPrice) {
            return parseFloat(chainConfig.gas.defaults.gasPrice);
        }
        
        // Fallback: Standard Gas Price für MEDAS
        return 0.025; // 0.025 umedas per gas unit
        
    } catch (error) {
        console.warn('Failed to get gas price, using default:', error);
        return 0.025;
    }
};

// ✅ MANUELLE GAS ESTIMATION
UIManager.prototype.estimateGasManually = async function(chainId, delegatorAddress, msgs) {
    try {
        const restUrl = MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
        
        // Hole Account Details
        const accountResponse = await fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${delegatorAddress}`);
        if (!accountResponse.ok) {
            throw new Error('Failed to fetch account');
        }
        
        const accountData = await accountResponse.json();
        const accountNumber = accountData.account?.account_number || '0';
        const sequence = accountData.account?.sequence || '0';
        
        // Erstelle Simulation Request
        const simulationTx = {
            tx: {
                body: {
                    messages: msgs,
                    memo: ""
                },
                auth_info: {
                    signer_infos: [{
                        public_key: null,
                        mode_info: {
                            single: {
                                mode: "SIGN_MODE_DIRECT"
                            }
                        },
                        sequence: sequence
                    }],
                    fee: {
                        amount: [],
                        gas_limit: "200000"
                    }
                }
            }
        };
        
        const simulateResponse = await fetch(`${restUrl}/cosmos/tx/v1beta1/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simulationTx)
        });
        
        if (simulateResponse.ok) {
            const result = await simulateResponse.json();
            const gasUsed = parseInt(result.gas_info?.gas_used || '200000');
            const gasEstimate = Math.floor(gasUsed * 1.3); // 30% Buffer
            
            const gasPrice = await this.getGasPrice(chainId);
            const feeAmount = Math.floor(gasEstimate * gasPrice).toString();
            
            console.log('⛽ Manual gas estimation successful:', { gasUsed, gasEstimate, feeAmount });
            
            return {
                gasEstimate: gasEstimate,
                gasUsed: gasUsed,
                fee: {
                    amount: [{
                        denom: "umedas",
                        amount: feeAmount
                    }],
                    gas: gasEstimate.toString()
                }
            };
        }
        
        throw new Error('Simulation failed');
        
    } catch (error) {
        console.warn('Manual gas estimation failed:', error);
        
        // Intelligente Defaults basierend auf Message-Typ
        const gasEstimate = this.getDefaultGasForMessage(msgs[0]);
        const gasPrice = await this.getGasPrice(chainId);
        const feeAmount = Math.floor(gasEstimate * gasPrice).toString();
        
        return {
            gasEstimate: gasEstimate,
            gasUsed: Math.floor(gasEstimate * 0.8),
            fee: {
                amount: [{
                    denom: "umedas",
                    amount: feeAmount
                }],
                gas: gasEstimate.toString()
            }
        };
    }
};

// ✅ DEFAULT GAS FÜR MESSAGE-TYPEN
UIManager.prototype.getDefaultGasForMessage = function(msg) {
    const messageGasMap = {
        "/cosmos.staking.v1beta1.MsgDelegate": 250000,
        "/cosmos.staking.v1beta1.MsgUndelegate": 300000,
        "/cosmos.staking.v1beta1.MsgBeginRedelegate": 350000,
        "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward": 150000,
        "/cosmos.bank.v1beta1.MsgSend": 100000
    };
    
    return messageGasMap[msg.typeUrl] || 200000;
};

// ✅ AMINO STAKING MIT GAS ESTIMATION
UIManager.prototype.performAminoStakingWithGas = async function(chainId, delegatorAddress, validatorAddress, amountInUmedas, gasEstimation) {
    try {
        const offlineSigner = window.getOfflineSigner(chainId);
        const accounts = await offlineSigner.getAccounts();
        
        if (!accounts.length) {
            throw new Error('No accounts found');
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
        
        // Erstelle Amino Transaction mit geschätztem Gas
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
            account_number: accountNumber.toString(),
            sequence: sequence.toString(),
            fee: gasEstimation.fee,
            msgs: [aminoMsg],
            memo: ""
        };
        
        console.log('📝 Signing with estimated gas:', gasEstimation.fee);
        
        // Signiere mit Keplr
        const signature = await window.keplr.signAmino(
            chainId,
            delegatorAddress,
            txDoc
        );
        
        console.log('✅ Amino transaction signed with estimated gas');
        
        // Background Broadcasting
        this.tryImprovedBackgroundBroadcast(signature, txDoc);
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ✅ SUCCESS HANDLER (Unverändert)
UIManager.prototype.handleStakingSuccess = function(delegatorAddress, stakeAmountInput, validatorSelect) {
    setTimeout(() => {
        console.log('🔄 Updating UI after staking...');
        this.populateUserDelegations(delegatorAddress);
        if (this.updateBalanceOverview) {
            this.updateBalanceOverview();
        }
        this.showNotification('✅ Updated staking data', 'info');
    }, 5000);
    
    // Form zurücksetzen
    stakeAmountInput.value = '';
    validatorSelect.value = 'Select a validator...';
};

// ✅ ERROR HANDLER (Erweitert)
UIManager.prototype.handleStakingError = function(error, amount, validatorAddress, validatorSelect) {
    let errorMessage = error.message;
    
    if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas fees';
    } else if (errorMessage.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user';
    } else if (errorMessage.includes('Request rejected')) {
        errorMessage = 'Transaction rejected - please try again';
    } else if (errorMessage.includes('gas estimation')) {
        errorMessage = 'Gas estimation failed - using default values';
    }
    
    this.showNotification(`❌ Staking failed: ${errorMessage}`, 'error');
    
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('denied')) {
        this.showNotification('💡 Try refreshing page and reconnecting wallet', 'info');
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
