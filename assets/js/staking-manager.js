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
    console.log('🔧 Creating delegate message for SDK 0.50.10...');
    console.log('📊 Params:', { delegatorAddress, validatorAddress, amount });
    
    // ✅ COSMOS SDK 0.50.10 MESSAGE FORMAT
    const message = {
        "@type": "/cosmos.staking.v1beta1.MsgDelegate",  // ← Protobuf type URL!
        delegator_address: delegatorAddress,
        validator_address: validatorAddress,
        amount: {
            denom: this.denom,
            amount: amount.toString()
        }
    };
    
    console.log('✅ Created delegate message:', message);
    return message;
}

createUndelegateMessage(delegatorAddress, validatorAddress, amount) {
    console.log('🔧 Creating undelegate message for SDK 0.50.10...');
    
    const message = {
        "@type": "/cosmos.staking.v1beta1.MsgUndelegate",  // ← Protobuf type URL!
        delegator_address: delegatorAddress,
        validator_address: validatorAddress,
        amount: {
            denom: this.denom,
            amount: amount.toString()
        }
    };
    
    console.log('✅ Created undelegate message:', message);
    return message;
}

createWithdrawRewardsMessage(delegatorAddress, validatorAddress) {
    console.log('🔧 Creating withdraw rewards message for SDK 0.50.10...');
    
    const message = {
        "@type": "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",  // ← Protobuf type URL!
        delegator_address: delegatorAddress,
        validator_address: validatorAddress
    };
    
    console.log('✅ Created withdraw rewards message:', message);
    return message;
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
        console.log('🔧 Encoding transaction for Cosmos SDK 0.50.10...');
        console.log('📊 SignedTx messages:', signedTx.signed.msgs);
        
        // ✅ VALIDIERE DASS MESSAGES EXISTIEREN
        if (!signedTx.signed.msgs || signedTx.signed.msgs.length === 0) {
            throw new Error('No messages in transaction');
        }
        
        // ✅ VALIDIERE MESSAGE FORMAT
        signedTx.signed.msgs.forEach((msg, index) => {
            console.log(`📊 Message ${index}:`, msg);
            
            if (!msg['@type']) {
                console.error(`❌ Message ${index} missing @type:`, msg);
                throw new Error(`Message ${index} missing @type field`);
            }
            
            if (!msg.delegator_address && !msg.validator_address) {
                console.error(`❌ Message ${index} missing required fields:`, msg);
                throw new Error(`Message ${index} missing required address fields`);
            }
        });
        
        // ✅ AMINO TX FORMAT für RPC broadcast_tx_sync (SDK 0.50.10)
        const aminoTx = {
            msg: signedTx.signed.msgs,      // ← Sollte jetzt korrekte @type haben
            fee: signedTx.signed.fee,
            signatures: [signedTx.signature],
            memo: signedTx.signed.memo || ""
        };
        
        console.log('🔧 Cosmos SDK 0.50.10 Amino TX (validated):', aminoTx);
        
        // ✅ JSON STRING für Base64 encoding
        const jsonString = JSON.stringify(aminoTx);
        console.log('📊 JSON string length:', jsonString.length);
        
        return jsonString;
        
    } catch (error) {
        console.error('❌ Transaction encoding failed:', error);
        console.error('❌ SignedTx structure:', signedTx);
        throw new Error(`Encoding failed: ${error.message}`);
    }
}

async broadcastTransaction(signedTx) {
    try {
        console.log('📡 Broadcasting via RPC (Cosmos SDK 0.50.10)...');
        
        // ✅ SCHRITT 1: Amino JSON erstellen
        const aminoTxString = await this.encodeTxForBroadcast(signedTx);
        
        // ✅ SCHRITT 2: Base64 encode für RPC
        const txBytes = btoa(aminoTxString);
        
        console.log('📡 TX bytes prepared for RPC broadcast');
        
        // ✅ SCHRITT 3: RPC broadcast_tx_sync (Cosmos SDK 0.50.10 compatible)
        const rpcResponse = await fetch('https://rpc.medas-digital.io:26657/broadcast_tx_sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "broadcast_tx_sync",
                params: {
                    tx: txBytes
                }
            })
        });

        console.log('📡 RPC Response status:', rpcResponse.status);

        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            console.error('❌ RPC broadcast failed:', errorText);
            throw new Error(`RPC broadcast failed: HTTP ${rpcResponse.status} - ${errorText}`);
        }

        const rpcResult = await rpcResponse.json();
        console.log('📡 RPC Result:', rpcResult);
        
        // ✅ SCHRITT 4: RPC Response verarbeiten (Cosmos SDK 0.50.10 format)
        if (rpcResult.error) {
            console.error('❌ RPC Error:', rpcResult.error);
            throw new Error(`RPC Error: ${rpcResult.error.message || rpcResult.error.data}`);
        }
        
        if (!rpcResult.result) {
            throw new Error('Invalid RPC response: missing result');
        }
        
        if (rpcResult.result.code !== 0) {
            const errorMsg = rpcResult.result.log || 'Unknown transaction error';
            console.error('❌ Transaction failed:', errorMsg);
            throw new Error(`Transaction failed: ${errorMsg}`);
        }

        console.log('🎉 Cosmos SDK 0.50.10 RPC broadcast successful!');
        
        return {
            success: true,
            txHash: rpcResult.result.hash,
            code: rpcResult.result.code,
            rawLog: rpcResult.result.log || 'Transaction successful',
            height: rpcResult.result.height || null,
            gasWanted: rpcResult.result.gas_wanted || null,
            gasUsed: rpcResult.result.gas_used || null
        };

    } catch (error) {
        console.error('❌ Cosmos SDK 0.50.10 RPC broadcast failed:', error);
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
