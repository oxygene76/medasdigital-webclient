// ===================================
// UI MANAGER - KORRIGIERTE VERSION
// ===================================

class UIManager {
    constructor() {
        this.activeTab = 'comm';
        this.messageHistory = new Map();
        this.contacts = new Map();
        this.validatorNameCache = new Map();
        
        // ✅ StakingManager hinzufügen
        this.stakingManager = new StakingManager();
        
        // ✅ WICHTIG: init() MUSS NACH stakingManager kommen
        this.init();
    }

    // ✅ Diese init() Methode war in Ihrer Version vorhanden
    init() {
        this.createStarfield();
        this.updateTimestamp();
        this.startTimestampUpdates();
        this.setupEventListeners();
        this.initializeTabSystem();
        this.showBootMessages();
    }

    // ===================================
    // NEUE STAKING METHODEN (MIT STAKINGMANAGER)
    // ===================================

    async performStaking() {
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
            this.showNotification('🔄 Preparing delegation...', 'info');
            
            const validatorAddress = validatorSelect.value;
            const delegatorAddress = window.terminal.account.address;
            
            // ✅ VERWENDE DEN NEUEN STAKINGMANAGER
            const result = await this.stakingManager.delegate(
                delegatorAddress,
                validatorAddress,
                amount
            );
            
            if (result.success) {
                this.showNotification('🎉 Delegation successful!', 'success');
                this.showNotification(result.message, 'success');
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
                
                // Reset form
                stakeAmountInput.value = '';
                validatorSelect.value = 'Select a validator...';
                
                // Refresh data
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    if (this.updateBalanceOverview) {
                        this.updateBalanceOverview();
                    }
                }, 2000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Staking failed:', error);
            this.showNotification(`❌ Staking failed: ${error.message}`, 'error');
        }
    }

    async claimAllRewards() {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Claiming all rewards...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            const delegations = await this.fetchUserDelegations(delegatorAddress);
            
            if (!delegations || delegations.length === 0) {
                this.showNotification('❌ No delegations found', 'error');
                return;
            }
            
            const validatorAddresses = delegations.map(d => d.validator_address);
            
            // ✅ VERWENDE DEN NEUEN STAKINGMANAGER
            const result = await this.stakingManager.claimRewards(
                delegatorAddress,
                validatorAddresses
            );
            
            if (result.success) {
                this.showNotification('🎉 Rewards claimed successfully!', 'success');
                this.showNotification(result.message, 'success');
                this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
                
                // Refresh data
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    if (this.updateBalanceOverview) {
                        this.updateBalanceOverview();
                    }
                }, 3000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Claim failed:', error);
            this.showNotification(`❌ Claim failed: ${error.message}`, 'error');
        }
    }

    async performUnstaking(validatorAddress, amount) {
        if (!window.terminal?.connected || !window.terminal?.account?.address) {
            this.showNotification('❌ Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showNotification('🔄 Preparing undelegation...', 'info');
            
            const delegatorAddress = window.terminal.account.address;
            
            // ✅ VERWENDE DEN NEUEN STAKINGMANAGER
            const result = await this.stakingManager.undelegate(
                delegatorAddress,
                validatorAddress, 
                amount
            );
            
            if (result.success) {
                this.showNotification(`✅ Undelegation successful!`, 'success');
                this.showNotification('⏰ Note: Unbonding period is 21 days', 'info');
                
                if (result.txHash) {
                    this.showNotification(`📡 TX Hash: ${result.txHash}`, 'info');
                }
                
                setTimeout(() => {
                    this.populateUserDelegations(delegatorAddress);
                    if (this.updateBalanceOverview) {
                        this.updateBalanceOverview();
                    }
                }, 3000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Unstaking failed:', error);
            
            if (error.message?.includes('Request rejected') || 
                error.message?.includes('User denied')) {
                this.showNotification('❌ Unstaking cancelled by user', 'error');
            } else {
                this.showNotification(`❌ Unstaking failed: ${error.message}`, 'error');
            }
        }
    }

    // ===================================
    // ALLE ANDEREN METHODEN BLEIBEN UNVERÄNDERT
    // ===================================
    
    // Starfield Animation
    createStarfield() {
        const starsContainer = document.getElementById('stars');
        const numStars = 150;
        
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }
    }

    // Timestamp Management
    updateTimestamp() {
        const now = new Date();
        const timeString = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        document.getElementById('current-time').textContent = timeString;
    }

    startTimestampUpdates() {
        setInterval(() => this.updateTimestamp(), 1000);
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Wallet connection
        document.getElementById('connect-wallet')?.addEventListener('click', () => {
            if (window.terminal) {
                window.terminal.connectWallet();
            }
        });

        // Message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (window.terminal) {
                        window.terminal.sendMessage();
                    }
                }
            });
        }

        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.filterTransactions(e.target.dataset.filter);
            }
        });

        // Keplr account change listener
        if (window.keplr) {
            window.addEventListener('keplr_keystorechange', () => {
                if (window.terminal) {
                    window.terminal.handleAccountChange();
                }
            });
        }
    }

    // Tab System Management
    initializeTabSystem() {
        this.switchTab('comm');
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const tabContent = document.getElementById(`${tabName}-tab`);
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');
        
        this.activeTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch(tabName) {
            case 'explorer':
                this.updateExplorerData();
                break;
            case 'staking':
                this.updateStakingData();
                break;
            case 'wallet':
                this.updateWalletData();
                break;
        }
    }

    // ===================================
    // ALLE ANDEREN METHODEN KOPIEREN SIE AUS IHRER ORIGINALEN UI-MANAGER.JS
    // ===================================
    
    // Message UI Management, Connection Status Updates, etc.
    // (Alle anderen Methoden bleiben genau wie in Ihrer ursprünglichen Datei)

    // ===================================
    // WICHTIGE STAKING METHODEN BEHALTEN
    // ===================================

    async fetchUserDelegations(delegatorAddress) {
        try {
            const restUrl = window.WEBCLIENT_API_CONFIG?.rest || window.MEDAS_CHAIN_CONFIG?.rest || 'https://app.medas-digital.io:8080/api/lcd';
            
            const delegationsResponse = await fetch(`${restUrl}/cosmos/staking/v1beta1/delegations/${delegatorAddress}`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            if (!delegationsResponse.ok) {
                throw new Error(`Delegations API failed: ${delegationsResponse.status}`);
            }
            
            const delegationsData = await delegationsResponse.json();
            
            const rewardsResponse = await fetch(`${restUrl}/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            let rewardsData = null;
            if (rewardsResponse.ok) {
                rewardsData = await rewardsResponse.json();
            }
            
            return delegationsData.delegation_responses?.map(delegation => {
                const validatorAddress = delegation.delegation.validator_address;
                const amount = this.formatTokenAmount(delegation.balance.amount, 6);
                
                let rewards = '0.000000';
                if (rewardsData?.rewards) {
                    const validatorRewards = rewardsData.rewards.find(r => r.validator_address === validatorAddress);
                    if (validatorRewards?.reward?.length > 0) {
                        const rewardAmount = validatorRewards.reward.find(r => r.denom === 'umedas')?.amount || '0';
                        rewards = this.formatTokenAmount(rewardAmount, 6);
                    }
                }
                
                return {
                    validator_address: validatorAddress,
                    validator_name: this.getValidatorName(validatorAddress),
                    amount: amount,
                    rewards: rewards,
                    shares: delegation.delegation.shares
                };
            }) || [];
        } catch (error) {
            console.error('❌ Failed to fetch user delegations:', error);
            return null;
        }
    }

    formatTokenAmount(amount, decimals = 6) {
        if (!amount || amount === '0') return '0.000000';
        const value = parseInt(amount) / Math.pow(10, decimals);
        return value.toFixed(6);
    }

    getValidatorName(operatorAddress, validatorData = null) {
        if (this.validatorNameCache.has(operatorAddress)) {
            return this.validatorNameCache.get(operatorAddress);
        }
        
        if (validatorData?.description?.moniker) {
            const realName = validatorData.description.moniker;
            this.validatorNameCache.set(operatorAddress, realName);
            return realName;
        }
        
        const shortAddress = operatorAddress.slice(-8).toUpperCase();
        const fallbackName = `Validator ${shortAddress}`;
        this.validatorNameCache.set(operatorAddress, fallbackName);
        
        return fallbackName;
    }

    showNotification(message, type = 'info') {
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? '#1a4a1a' : type === 'error' ? '#4a1a1a' : '#1a1a4a'};
            border: 1px solid ${type === 'success' ? '#00ff00' : type === 'error' ? '#ff0000' : '#00ffff'};
            color: ${type === 'success' ? '#00ff00' : type === 'error' ? '#ff0000' : '#00ffff'};
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // ===================================
    // ALLE ANDEREN METHODEN AUS IHRER ORIGINALEN DATEI HINZUFÜGEN
    // ===================================
    
    updateStakingData() {
        this.populateValidators();
        
        if (window.terminal?.connected) {
            const delegationsSection = document.getElementById('my-delegations-section');
            if (delegationsSection) {
                delegationsSection.style.display = 'block';
                this.populateUserDelegations(window.terminal.account.address);
            }
        }
    }

    async populateValidators() {
        console.log('🔍 Loading validators...');
        
        try {
            const validators = await this.fetchRealValidators();
            
            if (validators && validators.length > 0) {
                console.log('✅ Loaded validators:', validators.length);
                this.populateValidatorsWithActions(validators);
                this.updateValidatorSelect(validators);
                this.updateRedelegateToSelect(validators);
                return;
            }
            
            console.warn('⚠️ No real validators found, using fallback');
            this.populateValidatorsFallback();
            
        } catch (error) {
            console.error('❌ Failed to load validators:', error);
            this.populateValidatorsFallback();
        }
    }

    async fetchRealValidators() {
        console.log('🔍 Fetching real validators from blockchain...');
        
        try {
            const restUrl = window.WEBCLIENT_API_CONFIG?.rest || window.MEDAS_CHAIN_CONFIG?.rest || 'https://app.medas-digital.io:8080/api/lcd';
            const response = await fetch(`${restUrl}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=100`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`API failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.validators || data.validators.length === 0) {
                console.warn('⚠️ No validators returned from API');
                return null;
            }
            
            console.log(`📊 Raw validators from API: ${data.validators.length}`);
            
            return data.validators
                .filter(validator => validator.status === 'BOND_STATUS_BONDED')
                .sort((a, b) => {
                    const aTokens = parseInt(a.tokens || 0);
                    const bTokens = parseInt(b.tokens || 0);
                    return bTokens - aTokens;
                })
                .slice(0, 20);
        } catch (error) {
            console.error('❌ Failed to fetch real validators:', error);
            return null;
        }
    }

    populateValidatorsWithActions(validators) {
        const validatorsContainer = document.getElementById('validators-list');
        if (!validatorsContainer) {
            console.error('❌ validators-list container not found!');
            return;
        }

        console.log('📊 Displaying validators with actions:', validators.length);

        validators.forEach(validator => {
            if (validator.description?.moniker) {
                this.validatorNameCache.set(validator.operator_address, validator.description.moniker);
            }
        });

        validatorsContainer.innerHTML = validators.map((validator, index) => {
            const commission = parseFloat(validator.commission?.commission_rates?.rate || 0) * 100;
            const votingPower = this.formatTokenAmount(validator.tokens, 6);
            const status = validator.status === 'BOND_STATUS_BONDED' ? 'Active' : 'Inactive';
            const jailed = validator.jailed ? 'Jailed' : 'OK';
            
            const validatorName = validator.description?.moniker || 
                                 this.getValidatorName(validator.operator_address, validator);
            
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

        console.log('✅ Validators HTML generated with real names');
    }

    updateValidatorSelect(validators) {
        const validatorSelect = document.getElementById('validator-select');
        if (!validatorSelect) return;
        
        const currentValue = validatorSelect.value;
        
        validatorSelect.innerHTML = '<option>Select a validator...</option>' +
            validators.slice(0, 30).map(validator => {
                const validatorName = validator.description?.moniker || 
                                     this.getValidatorName(validator.operator_address, validator);
                const commission = parseFloat(validator.commission?.commission_rates?.rate || 0) * 100;
                return `<option value="${validator.operator_address}">${validatorName} (${commission.toFixed(1)}%)</option>`;
            }).join('');
        
        if (currentValue && currentValue !== 'Select a validator...') {
            validatorSelect.value = currentValue;
        }
    }

    updateRedelegateToSelect(validators) {
        const redelegateToSelect = document.getElementById('redelegate-to-select');
        if (!redelegateToSelect) return;
        
        redelegateToSelect.innerHTML = '<option>Select destination validator...</option>' +
            validators.slice(0, 50).map(validator => {
                const validatorName = validator.description?.moniker || 
                                     this.getValidatorName(validator.operator_address, validator);
                const commission = parseFloat(validator.commission?.commission_rates?.rate || 0) * 100;
                return `<option value="${validator.operator_address}">${validatorName} (${commission.toFixed(1)}%)</option>`;
            }).join('');
    }

    async populateUserDelegations(delegatorAddress) {
        console.log('🔍 Loading user delegations for:', delegatorAddress);
        
        try {
            const delegationsSection = document.getElementById('my-delegations-section');
            if (delegationsSection) {
                delegationsSection.style.display = 'block';
            }
            
            const delegations = await this.fetchUserDelegations(delegatorAddress);
            
            if (delegations && delegations.length > 0) {
                console.log('✅ Found delegations:', delegations.length);
                this.displayUserDelegations(delegations);
                this.updateDelegationSelects(delegations);
                this.updateStakingStatistics(delegations);
                return;
            }
            
            this.populateUserDelegationsFallback();
            
        } catch (error) {
            console.error('❌ Failed to load user delegations:', error);
            this.populateUserDelegationsFallback();
        }
    }

    displayUserDelegations(delegations) {
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
        
        const totalRewardsEl = document.getElementById('total-rewards');
        if (totalRewardsEl) {
            totalRewardsEl.textContent = `${totalRewards.toFixed(6)} MEDAS`;
        }
    }

    updateDelegationSelects(delegations) {
        const redelegateFromSelect = document.getElementById('redelegate-from-select');
        if (redelegateFromSelect) {
            redelegateFromSelect.innerHTML = '<option>Select source validator...</option>' +
                delegations.map(delegation => 
                    `<option value="${delegation.validator_address}">${delegation.validator_name} (${delegation.amount} MEDAS)</option>`
                ).join('');
        }
        
        const undelegateFromSelect = document.getElementById('undelegate-from-select');
        if (undelegateFromSelect) {
            undelegateFromSelect.innerHTML = '<option>Select validator to unstake from...</option>' +
                delegations.map(delegation => 
                    `<option value="${delegation.validator_address}">${delegation.validator_name} (${delegation.amount} MEDAS)</option>`
                ).join('');
        }
    }

    updateStakingStatistics(delegations) {
        let totalStaked = 0;
        let totalRewards = 0;
        
        delegations.forEach(delegation => {
            totalStaked += parseFloat(delegation.amount || '0');
            totalRewards += parseFloat(delegation.rewards || '0');
        });
        
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
        
        const monthlyEstimate = totalStaked * 0.12 / 12;
        const monthlyEstimateEl = document.getElementById('user-monthly-estimate');
        if (monthlyEstimateEl) {
            monthlyEstimateEl.textContent = `${monthlyEstimate.toFixed(6)} MEDAS`;
        }
    }

    populateUserDelegationsFallback() {
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

        ['total-rewards', 'user-total-staked', 'user-total-rewards', 'user-delegation-count', 'user-monthly-estimate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0.000000 MEDAS';
        });
        
        const delegationCountEl = document.getElementById('user-delegation-count');
        if (delegationCountEl) delegationCountEl.textContent = '0';
    }

    populateValidatorsFallback() {
        const validatorsContainer = document.getElementById('validators-list');
        if (!validatorsContainer || !window.MockData) return;

        console.warn('⚠️ Using fallback validator data (MockData)');
        
        validatorsContainer.innerHTML = window.MockData.validators.map(validator => `
            <div class="delegation-item">
                <div class="validator-info">
                    <div class="validator-name">${validator.name}</div>
                    <div class="validator-details">
                        Commission: ${validator.commission} | APY: ${validator.apy} | Status: ${validator.status}
                    </div>
                </div>
                <div class="stake-actions">
                    <button class="btn-small btn-primary" style="border-color: #00ffff; color: #00ffff;" 
                            onclick="selectValidator('${validator.name}', '${validator.name}')">
                        Select
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ===================================
    // ALLE WEITEREN METHODEN AUS IHRER URSPRÜNGLICHEN DATEI KOPIEREN
    // ===================================
    
    // Hier müssen Sie alle anderen Methoden aus Ihrer ursprünglichen ui-manager.js Datei einfügen:
    // - addMessageToUI()
    // - addSystemMessage()
    // - updateConnectionStatus()
    // - updateBlockchainUI()
    // - updateNetworkLatency()
    // - updateSystemStatus()
    // - updateUIAfterConnection()
    // - updateConnectButton()
    // - resetWalletInterface()
    // - showSystemMessage()
    // - showBootMessages()
    // - updateExplorerData()
    // - populateRecentBlocks()
    // - updateNetworkStats()
    // - updateNetworkOverviewData()
    // - populateWalletTransactions()
    // - updateWalletData()
    // - updateBalanceOverview()
    // - fetchUserBalances()
    // - updateBalanceOverviewFallback()
    // - setMaxSendAmount()
    // - setMaxStakeAmount()
    // - populateTransactionHistory()
    // - filterTransactions()
    // - etc.
}

// ===================================
// GLOBALE VALIDATOR BUTTON ACTIONS (UNVERÄNDERT)
// ===================================

window.selectValidatorAction = function(button) {
    const validatorAddress = button.dataset.validatorAddress;
    const validatorName = button.dataset.validatorName;
    
    console.log('📊 Validator selected via button:', validatorName, validatorAddress);
    
    if (window.selectValidator) {
        window.selectValidator(validatorAddress, validatorName);
    } else {
        const validatorSelect = document.getElementById('validator-select');
        if (validatorSelect) {
            let option = Array.from(validatorSelect.options).find(opt => opt.value === validatorAddress);
            if (!option) {
                option = new Option(validatorName, validatorAddress);
                validatorSelect.add(option);
            }
            validatorSelect.value = validatorAddress;
            
            button.textContent = 'Selected!';
            button.style.borderColor = '#00ff00';
            button.style.color = '#00ff00';
            
            setTimeout(() => {
                button.textContent = 'Select';
                button.style.borderColor = '#00ffff';
                button.style.color = '#00ffff';
            }, 1500);
            
            console.log(`📊 Selected validator: ${validatorName} (${validatorAddress})`);
        }
    }
};

window.quickStakeAction = function(button) {
    const validatorAddress = button.dataset.validatorAddress;
    const validatorName = button.dataset.validatorName;
    
    console.log('🚀 Quick stake for validator:', validatorName);
    
    const selectButton = button.parentElement.querySelector('[data-validator-address="' + validatorAddress + '"]');
    if (selectButton && selectButton !== button) {
        window.selectValidatorAction(selectButton);
    } else {
        window.selectValidatorAction(button);
    }
    
    setTimeout(() => {
        const stakeInput = document.getElementById('stake-amount');
        if (stakeInput) {
            stakeInput.focus();
            stakeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

window.selectValidator = function(validatorAddress, validatorName) {
    const validatorSelect = document.getElementById('validator-select');
    if (validatorSelect) {
        let option = Array.from(validatorSelect.options).find(opt => opt.value === validatorAddress);
        if (!option) {
            option = new Option(validatorName, validatorAddress);
            validatorSelect.add(option);
        }
        validatorSelect.value = validatorAddress;
        console.log(`📊 Selected validator: ${validatorName} (${validatorAddress})`);
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
    console.log('🎨 UIManager loaded with StakingManager integration!');
}
