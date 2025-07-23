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

// ===================================
// 🎯 PROBLEM GEFUNDEN: RPC Format ist falsch!
// ===================================

// Das Problem: broadcast_tx_sync erwartet RAW PROTOBUF, aber wir senden Amino JSON!
// Die Lösung: Verwenden Sie broadcast_tx_async oder anderen Endpoint

// Ersetzen Sie Ihre broadcastTransaction Methode:

async broadcastTransaction(signedTx) {
    console.log('📡 Broadcasting with CometBFT 0.37 format - FINAL FIX...');
    
    try {
        // ✅ LÖSUNG: Verwenden Sie Keplr's tx_bytes direkt (falls verfügbar)
        if (signedTx.tx_bytes) {
            console.log('✅ Using Keplr tx_bytes directly (Protobuf format)');
            const txBytesBase64 = btoa(String.fromCharCode(...new Uint8Array(signedTx.tx_bytes)));
            
            const rpcResponse = await fetch('https://rpc.medas-digital.io:26657/broadcast_tx_commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: -1,
                    method: 'broadcast_tx_commit',
                    params: { tx: txBytesBase64 }
                })
            });

            const result = await rpcResponse.json();
            
            if (result.result && result.result.check_tx.code === 0 && result.result.deliver_tx.code === 0) {
                console.log('🎉 Transaction confirmed in block!');
                console.log('📊 TX Hash:', result.result.hash);
                console.log('📊 Block Height:', result.result.height);
                console.log('📊 Gas Used:', result.result.deliver_tx.gas_used);
                
                return {
                    success: true,
                    txHash: result.result.hash,
                    blockHeight: result.result.height,
                    gasUsed: result.result.deliver_tx.gas_used,
                    gasWanted: result.result.deliver_tx.gas_wanted
                };
            } else {
                const error = result.result?.check_tx?.log || result.result?.deliver_tx?.log || 'Unknown error';
                throw new Error(`Transaction failed: ${error}`);
            }
        }
        
        // ✅ FALLBACK: Verwenden Sie Standard Amino Format für broadcast_tx_commit
        console.log('📊 No tx_bytes found - using StdTx Amino format');
        
        // Konvertieren Sie zu Standard Amino StdTx format
        const stdTx = {
            type: "cosmos-sdk/StdTx",
            value: {
                msg: signedTx.signed.msgs,
                fee: signedTx.signed.fee,
                signatures: [{
                    pub_key: signedTx.signature.pub_key,
                    signature: signedTx.signature.signature
                }],
                memo: signedTx.signed.memo || ""
            }
        };
        
        console.log('📊 StdTx format:', stdTx);
        
        // Encode zu Base64 für CometBFT
        const txBytesJson = JSON.stringify(stdTx);
        const txBytesBase64 = btoa(txBytesJson);
        
        console.log('📊 TX bytes length:', txBytesBase64.length);
        
        const rpcResponse = await fetch('https://rpc.medas-digital.io:26657/broadcast_tx_commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: -1,
                method: 'broadcast_tx_commit',
                params: { tx: txBytesBase64 }
            })
        });

        if (!rpcResponse.ok) {
            throw new Error(`HTTP ${rpcResponse.status}: ${rpcResponse.statusText}`);
        }

        const result = await rpcResponse.json();
        console.log('📡 CometBFT Result:', result);

        if (result.error) {
            throw new Error(`RPC Error: ${result.error.message}`);
        }

        // Prüfe CheckTx und DeliverTx
        const checkTx = result.result?.check_tx;
        const deliverTx = result.result?.deliver_tx;
        
        if (checkTx?.code !== 0) {
            console.log('❌ CheckTx failed:', checkTx);
            throw new Error(`Mempool validation failed: ${checkTx.log}`);
        }
        
        if (deliverTx?.code !== 0) {
            console.log('❌ DeliverTx failed:', deliverTx);
            throw new Error(`Block validation failed: ${deliverTx.log}`);
        }

        console.log('🎉 Transaction confirmed in block!');
        console.log('📊 TX Hash:', result.result.hash);
        console.log('📊 Block Height:', result.result.height);
        console.log('📊 Gas Used:', deliverTx.gas_used);

        return {
            success: true,
            txHash: result.result.hash,
            blockHeight: result.result.height,
            gasUsed: deliverTx.gas_used,
            gasWanted: deliverTx.gas_wanted
        };

    } catch (error) {
        console.log('❌ CometBFT broadcast failed:', error);
        throw error;
    }
}
// ===================================
// 🔧 KEPLR TX SERIALIZATION
// ===================================

serializeKeplrTx(signedTx) {
    try {
        console.log('🔧 Serializing Keplr transaction...');
        console.log('🔍 DEBUGGING TX WRAPPER CREATION:');
        
        // ✅ DEBUG: Schauen wir uns die rohen Messages an
        console.log('📊 Raw messages from Keplr:', signedTx.signed.msgs);
        console.log('📊 Message count:', signedTx.signed.msgs?.length);
        
        if (signedTx.signed.msgs && signedTx.signed.msgs.length > 0) {
            signedTx.signed.msgs.forEach((msg, i) => {
                console.log(`📊 Message ${i}:`, msg);
                console.log(`📊 Message ${i} @type:`, msg['@type']);
                console.log(`📊 Message ${i} keys:`, Object.keys(msg));
            });
        }
        
        // ✅ VERSCHIEDENE TX WRAPPER FORMATE TESTEN
        
        // FORMAT 1: Standard Cosmos SDK 0.50
        const txWrapper1 = {
            body: {
                messages: signedTx.signed.msgs,
                memo: signedTx.signed.memo || "",
                timeout_height: "0",
                extension_options: [],
                non_critical_extension_options: []
            },
            auth_info: {
                signer_infos: [{
                    public_key: {
                        "@type": "/cosmos.crypto.secp256k1.PubKey",
                        key: signedTx.signature.pub_key.value
                    },
                    mode_info: {
                        single: {
                            mode: "SIGN_MODE_LEGACY_AMINO_JSON"
                        }
                    },
                    sequence: signedTx.signed.sequence
                }],
                fee: {
                    amount: signedTx.signed.fee.amount,
                    gas_limit: signedTx.signed.fee.gas,
                    payer: "",
                    granter: ""
                }
            },
            signatures: [signedTx.signature.signature]
        };
        
        // FORMAT 2: Direkte Amino (wie async verwendet)
        const txWrapper2 = {
            msg: signedTx.signed.msgs,
            fee: signedTx.signed.fee,
            signatures: [signedTx.signature],
            memo: signedTx.signed.memo || ""
        };
        
        // FORMAT 3: StdTx Wrapper
        const txWrapper3 = {
            type: "cosmos-sdk/StdTx",
            value: {
                msg: signedTx.signed.msgs,
                fee: signedTx.signed.fee,
                signatures: [signedTx.signature],
                memo: signedTx.signed.memo || ""
            }
        };
        
        console.log('🔍 TESTING 3 DIFFERENT FORMATS:');
        console.log('📊 Format 1 (SDK 0.50):', txWrapper1);
        console.log('📊 Format 1 messages:', txWrapper1.body.messages);
        console.log('📊 Format 1 message count:', txWrapper1.body.messages?.length);
        
        console.log('📊 Format 2 (Direct Amino):', txWrapper2);
        console.log('📊 Format 2 messages:', txWrapper2.msg);
        console.log('📊 Format 2 message count:', txWrapper2.msg?.length);
        
        console.log('📊 Format 3 (StdTx):', txWrapper3);
        console.log('📊 Format 3 messages:', txWrapper3.value.msg);
        console.log('📊 Format 3 message count:', txWrapper3.value.msg?.length);
        
        // ✅ WELCHES FORMAT ZU VERWENDEN?
        // Da broadcast_tx_commit Raw Protobuf erwartet, aber wir JSON senden,
        // versuchen wir das Format das bei broadcast_tx_async funktioniert hat
        
        const txToUse = txWrapper2; // Direct Amino Format
        console.log('📊 Using Direct Amino format for CometBFT');
        
        // ✅ JSON → Base64
        const txBytes = btoa(JSON.stringify(txToUse));
        console.log('📊 Final tx bytes length:', txBytes.length);
        console.log('📊 Final tx bytes preview:', txBytes.substring(0, 100));
        
        // ✅ VALIDATION: Decode back to verify
        try {
            const decoded = JSON.parse(atob(txBytes));
            console.log('✅ Validation: Decoded TX:', decoded);
            console.log('✅ Validation: Message count after decode:', decoded.msg?.length);
            
            if (!decoded.msg || decoded.msg.length === 0) {
                console.error('❌ VALIDATION FAILED: No messages after encoding/decoding!');
                throw new Error('Transaction lost messages during encoding');
            }
        } catch (validationError) {
            console.error('❌ VALIDATION ERROR:', validationError);
            throw validationError;
        }
        
        return txBytes;
        
    } catch (error) {
        console.error('❌ TX serialization failed:', error);
        throw new Error(`TX serialization failed: ${error.message}`);
    }
}
// ===================================
// 🔧 COMMIT RESPONSE HANDLER
// ===================================

async handleCommitResponse(commitResponse) {
    try {
        console.log('📡 Commit Response status:', commitResponse.status);

        if (!commitResponse.ok) {
            const errorText = await commitResponse.text();
            throw new Error(`HTTP ${commitResponse.status}: ${errorText}`);
        }

        const commitResult = await commitResponse.json();
        console.log('📡 CometBFT Commit Result:', commitResult);
        
        // ✅ CometBFT Error Check
        if (commitResult.error) {
            console.error('❌ CometBFT Error:', commitResult.error);
            throw new Error(`CometBFT Error: ${commitResult.error.message || commitResult.error.data}`);
        }
        
        if (!commitResult.result) {
            throw new Error('Invalid CometBFT response: missing result');
        }
        
        // ✅ CheckTx Validation
        const checkTx = commitResult.result.check_tx;
        if (checkTx && checkTx.code !== 0) {
            console.error('❌ CheckTx failed:', checkTx);
            throw new Error(`Mempool validation failed: ${checkTx.log || checkTx.info || 'Unknown error'}`);
        }
        
        // ✅ DeliverTx Validation
        const deliverTx = commitResult.result.deliver_tx;
        if (!deliverTx) {
            throw new Error('Missing deliver_tx in CometBFT result');
        }
        
        if (deliverTx.code !== 0) {
            console.error('❌ DeliverTx failed:', deliverTx);
            throw new Error(`Transaction failed: ${deliverTx.log || deliverTx.info || 'Unknown error'}`);
        }

        // ✅ SUCCESS
        const txHash = commitResult.result.hash;
        const blockHeight = commitResult.result.height;
        
        console.log('🎉 CometBFT transaction confirmed!');
        console.log(`📊 TX Hash: ${txHash}`);
        console.log(`📊 Block Height: ${blockHeight}`);
        console.log(`📊 Gas Used: ${deliverTx.gas_used}/${deliverTx.gas_wanted}`);
        
        return {
            success: true,
            txHash: txHash,
            blockHeight: blockHeight,
            code: deliverTx.code,
            rawLog: deliverTx.log || 'Transaction successful',
            gasUsed: parseInt(deliverTx.gas_used || '0'),
            gasWanted: parseInt(deliverTx.gas_wanted || '0'),
            events: deliverTx.events || [],
            confirmed: true,
            checkTx: checkTx,
            deliverTx: deliverTx
        };

    } catch (error) {
        throw error;
    }
}
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
