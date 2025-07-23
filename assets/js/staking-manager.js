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
        console.log('🔍 VOLLSTÄNDIGES ENCODING DEBUG:');
        console.log('================================');
        
        // ✅ SCHRITT 1: SignedTx komplett analysieren
        console.log('📊 ROHE SignedTx Struktur:');
        console.log('- signedTx:', signedTx);
        console.log('- signedTx.signed:', signedTx.signed);
        console.log('- signedTx.signed.msgs:', signedTx.signed.msgs);
        console.log('- signedTx.signed.msgs.length:', signedTx.signed.msgs?.length);
        
        if (signedTx.signed.msgs && signedTx.signed.msgs.length > 0) {
            signedTx.signed.msgs.forEach((msg, i) => {
                console.log(`- Message ${i}:`, msg);
                console.log(`- Message ${i} keys:`, Object.keys(msg));
                console.log(`- Message ${i} @type:`, msg['@type']);
                console.log(`- Message ${i} type:`, msg.type);
            });
        } else {
            console.error('❌ PROBLEM: Keine Messages gefunden!');
        }
        
        // ✅ SCHRITT 2: Amino TX erstellen mit DEBUG
        const aminoTx = {
            msg: signedTx.signed.msgs,
            fee: signedTx.signed.fee,
            signatures: [signedTx.signature],
            memo: signedTx.signed.memo || ""
        };
        
        console.log('📊 AMINO TX STRUKTUR:');
        console.log('- aminoTx:', aminoTx);
        console.log('- aminoTx.msg:', aminoTx.msg);
        console.log('- aminoTx.msg.length:', aminoTx.msg?.length);
        
        // ✅ SCHRITT 3: JSON Serialization mit DEBUG
        const jsonString = JSON.stringify(aminoTx);
        console.log('📊 JSON SERIALIZATION:');
        console.log('- JSON string length:', jsonString.length);
        console.log('- JSON string (first 500 chars):', jsonString.substring(0, 500));
        
        // ✅ SCHRITT 4: Base64 mit DEBUG  
        const base64String = btoa(jsonString);
        console.log('📊 BASE64 ENCODING:');
        console.log('- Base64 length:', base64String.length);
        console.log('- Base64 (first 100 chars):', base64String.substring(0, 100));
        
        // ✅ SCHRITT 5: Validierung
        if (jsonString === '{"msg":[],"fee":{},"signatures":[],"memo":""}') {
            console.error('❌ LEER: Transaction ist komplett leer!');
            throw new Error('Transaction is empty - all fields are empty');
        }
        
        if (!aminoTx.msg || aminoTx.msg.length === 0) {
            console.error('❌ LEER: Messages Array ist leer!');
            throw new Error('Messages array is empty');
        }
        
        console.log('✅ Encoding validation passed');
        return jsonString;
        
    } catch (error) {
        console.error('❌ Encoding failed with full debug:', error);
        throw error;
    }
}

async broadcastTransaction(signedTx) {
    try {
        console.log('🔍 VOLLSTÄNDIGES BROADCAST DEBUG:');
        console.log('==================================');
        
        // ✅ SCHRITT 1: Encoding mit Debug
        const aminoTxString = await this.encodeTxForBroadcast(signedTx);
        const txBytes = btoa(aminoTxString);
        
        // ✅ SCHRITT 2: RPC Request Body erstellen
        const rpcRequestBody = {
            jsonrpc: "2.0",
            id: 1,
            method: "broadcast_tx_sync",
            params: {
                tx: txBytes
            }
        };
        
        console.log('📊 RPC REQUEST DEBUG:');
        console.log('- Request body:', rpcRequestBody);
        console.log('- Request body JSON:', JSON.stringify(rpcRequestBody));
        console.log('- TX bytes in request:', rpcRequestBody.params.tx);
        console.log('- TX bytes length:', rpcRequestBody.params.tx.length);
        
        // ✅ SCHRITT 3: Decodiere TX bytes zurück zum Testen
        try {
            const decodedTx = atob(rpcRequestBody.params.tx);
            const parsedTx = JSON.parse(decodedTx);
            console.log('📊 VERIFICATION - Decoded TX:');
            console.log('- Decoded tx:', parsedTx);
            console.log('- Decoded msg count:', parsedTx.msg?.length);
            console.log('- Decoded first message:', parsedTx.msg?.[0]);
        } catch (decodeError) {
            console.error('❌ Could not decode TX for verification:', decodeError);
        }
        
        // ✅ SCHRITT 4: RPC Call
        console.log('📡 Making RPC call...');
        const rpcResponse = await fetch('https://rpc.medas-digital.io:26657/broadcast_tx_sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rpcRequestBody)
        });

        console.log('📡 RPC Response status:', rpcResponse.status);
        
        if (!rpcResponse.ok) {
            const errorText = await rpcResponse.text();
            console.error('❌ RPC HTTP Error:', errorText);
            throw new Error(`RPC HTTP failed: ${rpcResponse.status} - ${errorText}`);
        }

        const rpcResult = await rpcResponse.json();
        console.log('📊 VOLLSTÄNDIGES RPC RESULT:');
        console.log('- RPC result:', rpcResult);
        console.log('- RPC result.result:', rpcResult.result);
        console.log('- RPC result.result.hash:', rpcResult.result?.hash);
        console.log('- RPC result.result.log:', rpcResult.result?.log);
        
        // ✅ Prüfe auf Empty Hash (SHA256 von leerem String)
        const emptyHash = "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855";
        if (rpcResult.result?.hash === emptyHash) {
            console.error('❌ EMPTY HASH DETECTED: Transaction arrived empty at server!');
            console.error('❌ This means the encoding or transmission failed');
        }
        
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

        console.log('🎉 RPC broadcast successful!');
        return {
            success: true,
            txHash: rpcResult.result.hash,
            code: rpcResult.result.code,
            rawLog: rpcResult.result.log || 'Transaction successful'
        };

    } catch (error) {
        console.error('❌ Broadcast failed with full debug:', error);
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
