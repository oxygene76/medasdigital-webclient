// ===================================
// STAKING-HELPERS.JS
// Separate Datei für alle Staking-spezifischen Funktionen
// ===================================

class StakingHelpers {
    constructor() {
        this.validatorCache = new Map();
        this.delegationRefreshInterval = null;
        this.init();
    }

    init() {
        this.setupKeyboardShortcuts();
        this.startAutoRefresh();
        console.log('🎯 Staking helpers initialized');
    }

    // ===================================
    // FORM VALIDATION & HELPERS
    // ===================================

    validateStakingForm() {
        const validatorSelect = document.getElementById('validator-select');
        const stakeAmountInput = document.getElementById('stake-amount');
        
        if (!validatorSelect?.value || validatorSelect.value === 'Select a validator...') {
            this.showError('❌ Please select a validator');
            return false;
        }
        
        const amount = parseFloat(stakeAmountInput?.value || '0');
        if (amount <= 0) {
            this.showError('❌ Please enter a valid amount');
            return false;
        }
        
        return { validatorAddress: validatorSelect.value, amount };
    }

    validateRedelegationForm() {
        const fromSelect = document.getElementById('redelegate-from-select');
        const toSelect = document.getElementById('redelegate-to-select');
        const amountInput = document.getElementById('redelegate-amount');
        
        if (!fromSelect?.value || fromSelect.value === 'Select source validator...') {
            this.showError('❌ Please select source validator');
            return false;
        }
        
        if (!toSelect?.value || toSelect.value === 'Select destination validator...') {
            this.showError('❌ Please select destination validator');
            return false;
        }
        
        if (fromSelect.value === toSelect.value) {
            this.showError('❌ Source and destination validators must be different');
            return false;
        }
        
        const amount = parseFloat(amountInput?.value || '0');
        if (amount <= 0) {
            this.showError('❌ Please enter valid amount');
            return false;
        }
        
        return {
            fromValidator: fromSelect.value,
            toValidator: toSelect.value,
            amount
        };
    }

    validateUndelegationForm() {
        const fromSelect = document.getElementById('undelegate-from-select');
        const amountInput = document.getElementById('undelegate-amount');
        
        if (!fromSelect?.value || fromSelect.value === 'Select validator to unstake from...') {
            this.showError('❌ Please select validator');
            return false;
        }
        
        const amount = parseFloat(amountInput?.value || '0');
        if (amount <= 0) {
            this.showError('❌ Please enter valid amount');
            return false;
        }
        
        return { validatorAddress: fromSelect.value, amount };
    }

    // ===================================
    // FORM INTERACTIONS
    // ===================================

    setMaxStakeAmount() {
        const stakeAmountInput = document.getElementById('stake-amount');
        if (!stakeAmountInput) return;
        
        // Hole verfügbare Balance vom UI Manager
        if (window.terminal?.ui?.setMaxStakeAmount) {
            window.terminal.ui.setMaxStakeAmount();
        } else {
            // Fallback
            stakeAmountInput.value = '1000.000000';
        }
    }

    setMaxUndelegateAmount(validatorAddress) {
        const undelegateFromSelect = document.getElementById('undelegate-from-select');
        const undelegateAmountInput = document.getElementById('undelegate-amount');
        
        if (!undelegateFromSelect || !undelegateAmountInput) return;
        
        // Setze Validator
        undelegateFromSelect.value = validatorAddress;
        
        // Extrahiere Betrag aus Option Text (Format: "ValidatorName (123.456789 MEDAS)")
        const selectedOption = undelegateFromSelect.options[undelegateFromSelect.selectedIndex];
        if (selectedOption && selectedOption.text.includes('(') && selectedOption.text.includes(' MEDAS)')) {
            const amountMatch = selectedOption.text.match(/\(([0-9.]+) MEDAS\)/);
            if (amountMatch) {
                undelegateAmountInput.value = amountMatch[1];
            }
        }
    }

    setMaxRedelegateAmount(validatorAddress) {
        const redelegateFromSelect = document.getElementById('redelegate-from-select');
        const redelegateAmountInput = document.getElementById('redelegate-amount');
        
        if (!redelegateFromSelect || !redelegateAmountInput) return;
        
        // Setze Validator
        redelegateFromSelect.value = validatorAddress;
        
        // Extrahiere Betrag aus Option Text
        const selectedOption = redelegateFromSelect.options[redelegateFromSelect.selectedIndex];
        if (selectedOption && selectedOption.text.includes('(') && selectedOption.text.includes(' MEDAS)')) {
            const amountMatch = selectedOption.text.match(/\(([0-9.]+) MEDAS\)/);
            if (amountMatch) {
                redelegateAmountInput.value = amountMatch[1];
            }
        }
    }

    // ===================================
    // QUICK ACTIONS
    // ===================================

    async quickStake(validatorAddress, validatorName) {
        const amount = prompt(`Quick Stake to ${validatorName}\n\nEnter amount in MEDAS:`);
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return;
        }
        
        // Auto-fill form
        this.selectValidator(validatorAddress, validatorName);
        
        const stakeAmountInput = document.getElementById('stake-amount');
        if (stakeAmountInput) {
            stakeAmountInput.value = amount;
        }
        
        // Trigger staking via UI Manager
        if (window.terminal?.ui?.performStaking) {
            await window.terminal.ui.performStaking();
        }
    }

    async addMoreStake(validatorAddress, validatorName) {
        const amount = prompt(`Add more stake to ${validatorName}\n\nEnter additional amount in MEDAS:`);
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return;
        }
        
        this.selectValidator(validatorAddress, validatorName);
        
        const stakeAmountInput = document.getElementById('stake-amount');
        if (stakeAmountInput) {
            stakeAmountInput.value = amount;
        }
        
        if (window.terminal?.ui?.performStaking) {
            await window.terminal.ui.performStaking();
        }
    }

    async claimRewards(validatorAddress, validatorName) {
        if (window.terminal?.ui?.claimSingleValidatorRewards) {
            await window.terminal.ui.claimSingleValidatorRewards(validatorAddress, validatorName);
        }
    }

    async unstakeFrom(validatorAddress, validatorName, currentAmount) {
        const maxAmount = parseFloat(currentAmount);
        const amount = prompt(`Unstake from ${validatorName}\n\nCurrent delegation: ${currentAmount} MEDAS\nEnter amount to unstake (max ${currentAmount}):`);
        
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return;
        }
        
        const unstakeAmount = parseFloat(amount);
        if (unstakeAmount > maxAmount) {
            this.showError(`❌ Cannot unstake more than ${currentAmount} MEDAS`);
            return;
        }
        
        const confirmed = confirm(`Are you sure you want to unstake ${amount} MEDAS from ${validatorName}?\n\nThis will start a 21-day unbonding period during which you won't earn rewards and cannot redelegate these tokens.`);
        if (!confirmed) return;
        
        if (window.terminal?.ui?.performUnstaking) {
            await window.terminal.ui.performUnstaking(validatorAddress, amount);
        }
    }

    // ===================================
    // FORM SUBMISSIONS
    // ===================================

    async performRedelegationFromForm() {
        const validation = this.validateRedelegationForm();
        if (!validation) return;
        
        const { fromValidator, toValidator, amount } = validation;
        
        if (window.terminal?.ui?.performRedelegation) {
            await window.terminal.ui.performRedelegation(fromValidator, toValidator, amount);
            this.resetRedelegationForm();
        }
    }

    async performUndelegationFromForm() {
        const validation = this.validateUndelegationForm();
        if (!validation) return;
        
        const { validatorAddress, amount } = validation;
        
        const confirmed = confirm(`Are you sure you want to undelegate ${amount} MEDAS?\n\nThis will start a 21-day unbonding period during which you won't earn rewards and cannot redelegate these tokens.`);
        if (!confirmed) return;
        
        if (window.terminal?.ui?.performUnstaking) {
            await window.terminal.ui.performUnstaking(validatorAddress, amount);
            this.resetUndelegationForm();
        }
    }

    // ===================================
    // FORM RESETS
    // ===================================

    resetStakingForm() {
        const validatorSelect = document.getElementById('validator-select');
        const stakeAmountInput = document.getElementById('stake-amount');
        
        if (validatorSelect) validatorSelect.value = 'Select a validator...';
        if (stakeAmountInput) stakeAmountInput.value = '';
    }

    resetRedelegationForm() {
        const fromSelect = document.getElementById('redelegate-from-select');
        const toSelect = document.getElementById('redelegate-to-select');
        const amountInput = document.getElementById('redelegate-amount');
        
        if (fromSelect) fromSelect.value = 'Select source validator...';
        if (toSelect) toSelect.value = 'Select destination validator...';
        if (amountInput) amountInput.value = '';
    }

    resetUndelegationForm() {
        const fromSelect = document.getElementById('undelegate-from-select');
        const amountInput = document.getElementById('undelegate-amount');
        
        if (fromSelect) fromSelect.value = 'Select validator to unstake from...';
        if (amountInput) amountInput.value = '';
    }

    // ===================================
    // UTILITY FUNCTIONS
    // ===================================

    selectValidator(validatorAddress, validatorName) {
        // Standard validator select
        const validatorSelect = document.getElementById('validator-select');
        if (validatorSelect) {
            this.addValidatorOption(validatorSelect, validatorAddress, validatorName);
            validatorSelect.value = validatorAddress;
        }
        
        // Redelegate To select
        const redelegateToSelect = document.getElementById('redelegate-to-select');
        if (redelegateToSelect) {
            this.addValidatorOption(redelegateToSelect, validatorAddress, validatorName);
        }
        
        console.log(`📊 Selected validator: ${validatorName} (${validatorAddress})`);
    }

    addValidatorOption(selectElement, validatorAddress, validatorName) {
        let option = Array.from(selectElement.options).find(opt => opt.value === validatorAddress);
        if (!option) {
            option = new Option(validatorName, validatorAddress);
            selectElement.add(option);
        }
    }

    copyValidatorAddress(validatorAddress) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(validatorAddress).then(() => {
                this.showSuccess('✅ Validator address copied to clipboard');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(validatorAddress);
            });
        } else {
            this.fallbackCopyTextToClipboard(validatorAddress);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showSuccess('✅ Validator address copied to clipboard');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }

    formatLargeNumber(number) {
        const num = parseFloat(number);
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toFixed(2);
    }

    calculateAPY(commission, totalSupply, bondedTokens) {
        // Vereinfachte APY Berechnung
        const baseAPY = 15; // 15% base APY
        const validatorCommission = parseFloat(commission) * 100;
        const effectiveAPY = baseAPY - validatorCommission;
        
        return Math.max(effectiveAPY, 0).toFixed(2);
    }

    // ===================================
    // NOTIFICATIONS
    // ===================================

    showSuccess(message) {
        if (window.terminal?.ui?.showNotification) {
            window.terminal.ui.showNotification(message, 'success');
        } else {
            console.log('✅', message);
        }
    }

    showError(message) {
        if (window.terminal?.ui?.showNotification) {
            window.terminal.ui.showNotification(message, 'error');
        } else {
            console.error('❌', message);
        }
    }

    showInfo(message) {
        if (window.terminal?.ui?.showNotification) {
            window.terminal.ui.showNotification(message, 'info');
        } else {
            console.log('ℹ️', message);
        }
    }

    // ===================================
    // KEYBOARD SHORTCUTS
    // ===================================

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Nur wenn Staking Tab aktiv ist
            if (window.terminal?.ui?.activeTab !== 'staking') return;
            
            // Ctrl/Cmd + S = Quick Stake
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                if (window.terminal?.ui?.performStaking) {
                    window.terminal.ui.performStaking();
                }
            }
            
            // Ctrl/Cmd + R = Claim All Rewards
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                if (window.terminal?.ui?.claimAllRewards) {
                    window.terminal.ui.claimAllRewards();
                }
            }
            
            // Escape = Reset forms
            if (event.key === 'Escape') {
                this.resetStakingForm();
                this.resetRedelegationForm();
                this.resetUndelegationForm();
            }
        });
    }

    // ===================================
    // AUTO-REFRESH
    // ===================================

    startAutoRefresh() {
        // Refreshe Delegations alle 60 Sekunden wenn Wallet verbunden
        this.delegationRefreshInterval = setInterval(() => {
            if (window.terminal?.connected && 
                window.terminal?.account?.address && 
                window.terminal?.ui?.activeTab === 'staking') {
                
                console.log('🔄 Auto-refreshing delegations...');
                if (window.terminal.ui.populateUserDelegations) {
                    window.terminal.ui.populateUserDelegations(window.terminal.account.address);
                }
            }
        }, 60000); // 60 seconds
    }

    stopAutoRefresh() {
        if (this.delegationRefreshInterval) {
            clearInterval(this.delegationRefreshInterval);
            this.delegationRefreshInterval = null;
        }
    }

    // ===================================
    // CLEANUP
    // ===================================

    destroy() {
        this.stopAutoRefresh();
        this.validatorCache.clear();
        console.log('🧹 Staking helpers destroyed');
    }
}

// ===================================
// GLOBAL FUNCTIONS (für HTML onclick Events)
// ===================================

// Globale Instanz
window.stakingHelpers = new StakingHelpers();

// Export functions für HTML
window.quickStake = (validatorAddress, validatorName) => 
    window.stakingHelpers.quickStake(validatorAddress, validatorName);

window.addMoreStake = (validatorAddress, validatorName) => 
    window.stakingHelpers.addMoreStake(validatorAddress, validatorName);

window.claimRewards = (validatorAddress, validatorName) => 
    window.stakingHelpers.claimRewards(validatorAddress, validatorName);

window.unstakeFrom = (validatorAddress, validatorName, currentAmount) => 
    window.stakingHelpers.unstakeFrom(validatorAddress, validatorName, currentAmount);

window.performRedelegationFromForm = () => 
    window.stakingHelpers.performRedelegationFromForm();

window.performUndelegationFromForm = () => 
    window.stakingHelpers.performUndelegationFromForm();

window.setMaxUndelegateAmount = (validatorAddress) => 
    window.stakingHelpers.setMaxUndelegateAmount(validatorAddress);

window.setMaxRedelegateAmount = (validatorAddress) => 
    window.stakingHelpers.setMaxRedelegateAmount(validatorAddress);

window.copyValidatorAddress = (validatorAddress) => 
    window.stakingHelpers.copyValidatorAddress(validatorAddress);

// Legacy support für bestehende selectValidator Funktion
if (!window.selectValidator) {
    window.selectValidator = (validatorAddress, validatorName) => 
        window.stakingHelpers.selectValidator(validatorAddress, validatorName);
}

// Cleanup bei Seiten-Verlassen
window.addEventListener('beforeunload', () => {
    window.stakingHelpers?.destroy();
});

console.log('🎯 Staking helpers loaded and ready');
