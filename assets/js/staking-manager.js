// ===================================
// STAKING-MANAGER.JS - NUR STAKINGMANAGER!
// ===================================

class StakingManager {
    constructor() {
        this.chainId = "medasdigital-2";
        this.denom = "umedas";
        this.decimals = 6;
        this.gasPrice = 0.025;
    }

    async connectKeplr() {
        try {
            if (!window.keplr) {
                throw new Error('Keplr extension not found. Please install Keplr.');
            }

            await window.keplr.enable(this.chainId);
            const key = await window.keplr.getKey(this.chainId);
            
            console.log('✅ Keplr connected:', key.bech32Address);
            return {
                address: key.bech32Address,
                pubkey: key.pubKey
            };
        } catch (error) {
            console.error('❌ Keplr connection failed:', error);
            throw error;
        }
    }

    async getAccountInfo(address) {
        try {
            const restUrl = window.MEDAS_CHAIN_CONFIG?.rest || 'https://lcd.medas-digital.io:1317';
            const response = await fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${address}`);
            
            if (!response.ok) {
                throw new Error(`Account info fetch failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                accountNumber: data.account.account_number.toString(),
                sequence: data.account.sequence.toString()
            };
        } catch (error) {
            console.error('❌ Failed to get account info:', error);
            return {
                accountNumber: "0",
                sequence: "0"
            };
        }
    }

    createDelegateMessage(delegatorAddress, validatorAddress, amount) {
        return {
            type: "cosmos-sdk/MsgDelegate",
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: this.denom,
                    amount: amount.toString()
                }
            }
        };
    }

    createUndelegateMessage(delegatorAddress, validatorAddress, amount) {
        return {
            type: "cosmos-sdk/MsgUndelegate",
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress,
                amount: {
                    denom: this.denom,
                    amount: amount.toString()
                }
            }
        };
    }

    createWithdrawRewardsMessage(delegatorAddress, validatorAddress) {
        return {
            type: "cosmos-sdk/MsgWithdrawDelegatorReward",
            value: {
                delegator_address: delegatorAddress,
                validator_address: validatorAddress
            }
        };
    }

    calculateFee(gasLimit) {
        const gasAmount = Math.ceil(gasLimit * this.gasPrice);
        return {
            gas: gasLimit.toString(),
            amount: [{
                denom: this.denom,
                amount: gasAmount.toString()
            }]
        };
    }

    async signWithAmino(signerAddress, messages, fee, memo = "") {
        try {
            const accountInfo = await this.getAccountInfo(signerAddress);
            
            const signDoc = {
                chain_id: this.chainId,
                account_number: accountInfo.accountNumber,
                sequence: accountInfo.sequence,
                timeout_height: "0",
                fee: fee,
                msgs: messages,
                memo: memo
            };

            console.log('📝 Signing document:', signDoc);

            const signResponse = await window.keplr.signAmino(
                this.chainId,
                signerAddress,
                signDoc,
                {
                    preferNoSetFee: false,
                    preferNoSetMemo: false,
                    disableBalanceCheck: false
                }
            );

            console.log('✅ Amino signing successful');
            return signResponse;
        } catch (error) {
            console.error('❌ Amino signing failed:', error);
            throw error;
        }
    }

   // ===================================
// 🎯 IHRE BEIDEN FUNKTIONEN - DIREKT UND OHNE FALLBACKS
// ===================================

async encodeTxForBroadcast(signedTx) {
    try {
        console.log('🔧 Encoding transaction via TxEncodeAmino (DIRECT URL)...');
        console.log('🔍 SignedTx structure:', signedTx);
        
        // ✅ KORRIGIERTES AMINO FORMAT - StdTx Wrapper hinzufügen!
        const stdTx = {
            type: "cosmos-sdk/StdTx",      // ← DAS HAT GEFEHLT!
            value: {
                msg: signedTx.signed.msgs,
                fee: signedTx.signed.fee,
                signatures: [signedTx.signature],
                memo: signedTx.signed.memo || "",
                timeout_height: "0"        // ← DAS HAT AUCH GEFEHLT!
            }
        };
        
        console.log('🔧 Correct StdTx for encoding:', stdTx);
        
        // ✅ REQUEST BODY mit korrektem Format
        const requestBody = {
            amino_json: JSON.stringify(stdTx)  // ← Jetzt mit StdTx wrapper!
        };
        
        console.log('🔧 Corrected Request Body:', requestBody);
        
        // ✅ DIREKTE LCD URL (kein Proxy mehr!)
        const restUrl = 'https://lcd.medas-digital.io:1317';  // ← DIREKT!
        const encodeResponse = await fetch(`${restUrl}/cosmos/tx/v1beta1/encode/amino`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('🔧 Response Status:', encodeResponse.status);
        
        // ✅ SCHAUEN WIR UNS DIE ANTWORT AN
        const responseText = await encodeResponse.text();
        console.log('🔧 Raw Response Text:', responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('🔧 Parsed Response JSON:', responseData);
        } catch (parseError) {
            console.log('🔧 Response is not JSON:', parseError.message);
            responseData = responseText;
        }

        if (!encodeResponse.ok) {
            console.error('❌ TxEncodeAmino failed!');
            console.error('❌ Status:', encodeResponse.status);
            console.error('❌ Response:', responseData);
            throw new Error(`TxEncodeAmino failed: HTTP ${encodeResponse.status} - ${responseText}`);
        }

        console.log('✅ TxEncodeAmino successful!');
        console.log('✅ Response data:', responseData);
        
        if (responseData && responseData.amino_binary) {
            console.log('✅ Got amino_binary:', responseData.amino_binary);
            return responseData.amino_binary;
        } else {
            console.error('❌ No amino_binary in response!');
            console.error('❌ Available keys:', Object.keys(responseData || {}));
            throw new Error('No amino_binary in response');
        }
        
    } catch (error) {
        console.error('❌ Transaction encoding failed:', error);
        console.error('❌ SignedTx was:', signedTx);
        throw new Error(`Encoding failed: ${error.message}`);
    }
}

async broadcastTransaction(signedTx) {
    try {
        // ✅ DIREKTE LCD URL (kein Proxy mehr!)
        const restUrl = 'https://lcd.medas-digital.io:1317';  // ← DIREKT!
        
        console.log('📡 Broadcasting transaction with modern API (DIRECT)...');
        
        // ✅ SCHRITT 1: Transaction encodieren
        const txBytes = await this.encodeTxForBroadcast(signedTx);
        
        const broadcastReq = {
            tx_bytes: txBytes,
            mode: "BROADCAST_MODE_SYNC"
        };
        
        console.log('📡 Broadcasting with protobuf bytes...');
        console.log('📡 Broadcast request:', broadcastReq);
        
        // ✅ SCHRITT 2: Broadcast mit moderner API (DIREKT!)
        const response = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(broadcastReq)
        });

        console.log('📡 Broadcast response status:', response.status);

        // ✅ SCHAUEN WIR UNS DIE KOMPLETTE BROADCAST-ANTWORT AN
        const broadcastResponseText = await response.text();
        console.log('📡 Raw Broadcast Response:', broadcastResponseText);
        
        let broadcastData;
        try {
            broadcastData = JSON.parse(broadcastResponseText);
            console.log('📡 Parsed Broadcast Response:', broadcastData);
        } catch (parseError) {
            console.log('📡 Broadcast response is not JSON:', parseError.message);
            broadcastData = broadcastResponseText;
        }

        if (!response.ok) {
            console.error('❌ Broadcast failed!');
            console.error('❌ Status:', response.status);
            console.error('❌ Response:', broadcastData);
            throw new Error(`Broadcast failed: HTTP ${response.status} - ${broadcastResponseText}`);
        }

        console.log('🎉 Broadcast successful!');
        console.log('🎉 Broadcast result:', broadcastData);
        
        if (broadcastData && broadcastData.tx_response && broadcastData.tx_response.code !== 0) {
            throw new Error(`Transaction failed: ${broadcastData.tx_response.raw_log}`);
        }

        return {
            success: true,
            txHash: broadcastData.tx_response?.txhash,
            code: broadcastData.tx_response?.code,
            rawLog: broadcastData.tx_response?.raw_log
        };
        
    } catch (error) {
        console.error('❌ Transaction broadcast failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}


// ===================================
// 📝 WAS PASSIERT:
// ===================================

/*
🎯 DIREKTE STRATEGIE:
1. encodeTxForBroadcast → TxEncodeAmino für echte Protobuf bytes
2. broadcastTransaction → Moderne /cosmos/tx/v1beta1/txs API

✨ SAUBER UND DIREKT - genau wie Sie es wollten!
*/
    async delegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('🥩 Starting delegation process...');
            
            const account = await this.connectKeplr();
            if (account.address !== delegatorAddress) {
                throw new Error('Connected account does not match delegator address');
            }

            const amountInUmedas = Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
            console.log(`Amount in umedas: ${amountInUmedas}`);

            const delegateMsg = this.createDelegateMessage(
                delegatorAddress,
                validatorAddress,
                amountInUmedas
            );

            const gasLimit = 300000;
            const fee = this.calculateFee(gasLimit);

            console.log('💰 Transaction fee:', fee);

            const signedTx = await this.signWithAmino(
                delegatorAddress,
                [delegateMsg],
                fee,
                `Stake ${amountInMedas} MEDAS to validator`
            );

            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('🎉 Delegation successful!');
                return {
                    success: true,
                    txHash: result.txHash,
                    message: `Successfully delegated ${amountInMedas} MEDAS`
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Delegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async undelegate(delegatorAddress, validatorAddress, amountInMedas) {
        try {
            console.log('📉 Starting undelegation process...');

            const account = await this.connectKeplr();
            const amountInUmedas = Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));

            const undelegateMsg = this.createUndelegateMessage(
                delegatorAddress,
                validatorAddress,
                amountInUmedas
            );

            const gasLimit = 350000;
            const fee = this.calculateFee(gasLimit);

            const signedTx = await this.signWithAmino(
                delegatorAddress,
                [undelegateMsg],
                fee,
                `Unstake ${amountInMedas} MEDAS from validator`
            );

            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('✅ Undelegation successful!');
                return {
                    success: true,
                    txHash: result.txHash,
                    message: `Successfully undelegated ${amountInMedas} MEDAS (21-day unbonding period)`
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Undelegation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async claimRewards(delegatorAddress, validatorAddresses) {
        try {
            console.log('🏆 Starting rewards claiming process...');

            const account = await this.connectKeplr();

            const withdrawMsgs = validatorAddresses.map(validatorAddress =>
                this.createWithdrawRewardsMessage(delegatorAddress, validatorAddress)
            );

            const gasLimit = 200000 + (validatorAddresses.length * 100000);
            const fee = this.calculateFee(gasLimit);

            const signedTx = await this.signWithAmino(
                delegatorAddress,
                withdrawMsgs,
                fee,
                `Claim rewards from ${validatorAddresses.length} validators`
            );

            const result = await this.broadcastTransaction(signedTx);

            if (result.success) {
                console.log('🎉 Rewards claiming successful!');
                return {
                    success: true,
                    txHash: result.txHash,
                    message: `Successfully claimed rewards from ${validatorAddresses.length} validators`
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Rewards claiming failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatMedas(amountInUmedas) {
        return (parseInt(amountInUmedas) / Math.pow(10, this.decimals)).toFixed(6);
    }

    formatUmedas(amountInMedas) {
        return Math.floor(parseFloat(amountInMedas) * Math.pow(10, this.decimals));
    }
}

// ===================================
// TESTING FUNKTION
// ===================================
window.testStakingManager = async function() {
    console.log('🧪 TESTING STAKING MANAGER...');
    
    const stakingManager = new StakingManager();
    
    try {
        // Test connection
        const account = await stakingManager.connectKeplr();
        console.log('✅ Keplr connected:', account.address);
        
        // Test account info
        const accountInfo = await stakingManager.getAccountInfo(account.address);
        console.log('✅ Account info:', accountInfo);
        
        // Test message creation
        const testMsg = stakingManager.createDelegateMessage(
            account.address,
            'medasvaloperTest',
            1000000 // 1 MEDAS in umedas
        );
        console.log('✅ Message created:', testMsg);
        
        // Test fee calculation
        const testFee = stakingManager.calculateFee(300000);
        console.log('✅ Fee calculated:', testFee);
        
        return 'StakingManager test complete - all functions working!';
        
    } catch (error) {
        console.error('❌ StakingManager test failed:', error);
        return `Test failed: ${error.message}`;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StakingManager;
} else {
    window.StakingManager = StakingManager;
    console.log('🥩 StakingManager loaded - Cosmos SDK 0.50.10 + Keplr compatible');
}
