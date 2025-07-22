// ===================================
// GLOBALE HELPER-FUNKTIONEN FÜR STAKING
// Diese Funktionen in Ihre index.html oder als separate .js-Datei hinzufügen
// ===================================

// 1. CLAIM REWARDS VON EINZELNEM VALIDATOR
async function claimRewards(validatorAddress, validatorName) {
    if (!window.terminal?.ui?.claimSingleValidatorRewards) {
        window.terminal?.ui?.showNotification('❌ Function not available', 'error');
        return;
    }
    
    await window.terminal.ui.claimSingleValidatorRewards(validatorAddress, validatorName);
}

// 2. ADD MORE STAKE ZU BESTEHENDEM VALIDATOR
async function addMoreStake(validatorAddress, validatorName) {
    const amount = prompt(`Add more stake to ${validatorName}\n\nEnter additional amount in MEDAS:`);
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return;
    }
    
    // Setze Validator im Select und führe Staking aus
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    if (validatorSelect) {
        // Füge Option hinzu falls nicht vorhanden
        let option = Array.from(validatorSelect.options).find(opt => opt.value === validatorAddress);
        if (!option) {
            option = new Option(validatorName, validatorAddress);
            validatorSelect.add(option);
        }
        validatorSelect.value = validatorAddress;
    }
    
    if (stakeAmountInput) {
        stakeAmountInput.value = amount;
    }
    
    // Führe Staking aus
    await window.terminal?.ui?.performStaking();
}

// 3. UNSTAKE FROM SPECIFIC VALIDATOR
async function unstakeFrom(validatorAddress, validatorName, currentAmount) {
    const maxAmount = parseFloat(currentAmount);
    const amount = prompt(`Unstake from ${validatorName}\n\nCurrent delegation: ${currentAmount} MEDAS\nEnter amount to unstake (max ${currentAmount}):`);
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return;
    }
    
    const unstakeAmount = parseFloat(amount);
    if (unstakeAmount > maxAmount) {
        window.terminal?.ui?.showNotification(`❌ Cannot unstake more than ${currentAmount} MEDAS`, 'error');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to unstake ${amount} MEDAS from ${validatorName}?\n\nThis will start a 21-day unbonding period during which you won't earn rewards and cannot redelegate these tokens.`);
    if (!confirmed) return;
    
    await window.terminal?.ui?.performUnstaking(validatorAddress, amount);
}

// 4. SET MAX UNDELEGATE AMOUNT
function setMaxUndelegateAmount(validatorAddress) {
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

// 5. SET MAX REDELEGATE AMOUNT
function setMaxRedelegateAmount(validatorAddress) {
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

// 6. VALIDATE STAKING FORM
function validateStakingForm() {
    const validatorSelect = document.getElementById('validator-select');
    const stakeAmountInput = document.getElementById('stake-amount');
    
    if (!validatorSelect?.value || validatorSelect.value === 'Select a validator...') {
        window.terminal?.ui?.showNotification('❌ Please select a validator', 'error');
        return false;
    }
    
    const amount = parseFloat(stakeAmountInput?.value || '0');
    if (amount <= 0) {
        window.terminal?.ui?.showNotification('❌ Please enter a valid amount', 'error');
        return false;
    }
    
    return true;
}

// 7. ENHANCED VALIDATOR SELECTION (mit Auto-Population)
window.selectValidatorAdvanced = function(validatorAddress, validatorName) {
    // Standard validator select
    const validatorSelect = document.getElementById('validator-select');
    if (validatorSelect) {
        let option = Array.from(validatorSelect.options).find(opt => opt.value === validatorAddress);
        if (!option) {
            option = new Option(validatorName, validatorAddress);
            validatorSelect.add(option);
        }
        validatorSelect.value = validatorAddress;
    }
    
    // Redelegate To select
    const redelegateToSelect = document.getElementById('redelegate-to-select');
    if (redelegateToSelect) {
        let option = Array.from(redelegateToSelect.options).find(opt => opt.value === validatorAddress);
        if (!option) {
            option = new Option(validatorName, validatorAddress);
            redelegateToSelect.add(option);
        }
    }
    
    console.log(`📊 Advanced validator selection: ${validatorName} (${validatorAddress})`);
};

// 8. COPY VALIDATOR ADDRESS
function copyValidatorAddress(validatorAddress) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(validatorAddress).then(() => {
            window.terminal?.ui?.showNotification('✅ Validator address copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopyTextToClipboard(validatorAddress);
        });
    } else {
        fallbackCopyTextToClipboard(validatorAddress);
    }
}

// Fallback copy function
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            window.terminal?.ui?.showNotification('✅ Validator address copied to clipboard', 'success');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

// 9. FORMAT LARGE NUMBERS
function formatLargeNumber(number) {
    const num = parseFloat(number);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

// 10. CALCULATE APY
function calculateAPY(commission, totalSupply, bondedTokens) {
    // Vereinfachte APY Berechnung
    // Basis: ~15% jährliche Inflation, minus Validator Commission
    const baseAPY = 15; // 15% base APY
    const validatorCommission = parseFloat(commission) * 100;
    const effectiveAPY = baseAPY - validatorCommission;
    
    return Math.max(effectiveAPY, 0).toFixed(2);
}

// 11. KEYBOARD SHORTCUTS
document.addEventListener('keydown', function(event) {
    // Nur wenn Staking Tab aktiv ist
    if (window.terminal?.ui?.activeTab !== 'staking') return;
    
    // Ctrl/Cmd + S = Quick Stake
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (validateStakingForm()) {
            window.terminal?.ui?.performStaking();
        }
    }
    
    // Ctrl/Cmd + R = Claim All Rewards
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        window.terminal?.ui?.claimAllRewards();
    }
});

// 12. AUTO-REFRESH DELEGATIONS
function startDelegationRefresh() {
    // Refreshe Delegations alle 60 Sekunden wenn Wallet verbunden
    setInterval(() => {
        if (window.terminal?.connected && window.terminal?.account?.address && window.terminal?.ui?.activeTab === 'staking') {
            console.log('🔄 Auto-refreshing delegations...');
            window.terminal.ui.populateUserDelegations(window.terminal.account.address);
        }
    }, 60000); // 60 seconds
}

// Starte Auto-Refresh wenn DOM geladen
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDelegationRefresh);
} else {
    startDelegationRefresh();
}

console.log('🎯 Global staking helper functions loaded');
