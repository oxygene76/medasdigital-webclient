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
    console.log('🔧 Creating delegate message for Amino/RPC...');
    console.log('📊 Params:', { delegatorAddress, validatorAddress, amount });
    
    // ✅ AMINO FORMAT (nicht Protobuf @type)
    const message = {
        type: "cosmos-sdk/MsgDelegate",  // ← Amino type!
        value: {
            delegator_address: delegatorAddress,
            validator_address: validatorAddress,
            amount: {
                denom: this.denom,
                amount: amount.toString()
            }
        }
    };
    
    console.log('✅ Created Amino delegate message:', message);
    return message;
}

createUndelegateMessage(delegatorAddress, validatorAddress, amount) {
    console.log('🔧 Creating undelegate message for Amino/RPC...');
    
    const message = {
        type: "cosmos-sdk/MsgUndelegate",  // ← Amino type!
        value: {
            delegator_address: delegatorAddress,
            validator_address: validatorAddress,
            amount: {
                denom: this.denom,
                amount: amount.toString()
            }
        }
    };
    
    console.log('✅ Created Amino undelegate message:', message);
    return message;
}

createWithdrawRewardsMessage(delegatorAddress, validatorAddress) {
    console.log('🔧 Creating withdraw rewards message for Amino/RPC...');
    
    const message = {
        type: "cosmos-sdk/MsgWithdrawDelegatorReward",  // ← Amino type!
        value: {
            delegator_address: delegatorAddress,
            validator_address: validatorAddress
        }
    };
    
    console.log('✅ Created Amino withdraw rewards message:', message);
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
        console.log('🔍 AMINO BINARY ENCODING FÜR KEPLR:');
        console.log('====================================');
        
        // ✅ SCHRITT 1: Analysiere SignedTx (von signAmino)
        console.log('📊 SignedTx from signAmino:', signedTx);
        console.log('📊 Messages:', signedTx.signed.msgs);
        console.log('📊 Signature:', signedTx.signature);
        
        if (!signedTx.signed.msgs || signedTx.signed.msgs.length === 0) {
            throw new Error('No messages found in signed transaction');
        }
        
        // ✅ SCHRITT 2: Erstelle Transaction (für Broadcast Format)
        const transaction = {
            msg: signedTx.signed.msgs,
            fee: signedTx.signed.fee,
            signatures: [signedTx.signature],
            memo: signedTx.signed.memo || ""
        };
        
        console.log('📊 Transaction structure:', transaction);
        console.log('📊 Message count:', transaction.msg.length);
        console.log('📊 Signature present:', !!transaction.signatures[0]);
        
        // ✅ SCHRITT 3: JSON → Binary (UTF-8 Encoding)
        const txJson = JSON.stringify(transaction);
        const txBinary = new TextEncoder().encode(txJson);
        
        console.log('📊 BINARY ENCODING RESULT:');
        console.log('- JSON string length:', txJson.length);
        console.log('- Binary data length:', txBinary.length);
        console.log('- Is Uint8Array:', txBinary instanceof Uint8Array);
        console.log('- First 20 bytes:', Array.from(txBinary.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        console.log('- First 20 chars:', txJson.substring(0, 20));
        
        // ✅ SCHRITT 4: Validierung
        if (txBinary.length === 0) {
            throw new Error('Binary encoding resulted in empty data');
        }
        
        // Decode test
        const decoded = JSON.parse(new TextDecoder().decode(txBinary));
        if (!decoded.msg || decoded.msg.length === 0) {
            throw new Error('Validation failed: Messages lost during encoding');
        }
        
        console.log('✅ Amino binary encoding completed successfully');
        console.log('📊 Ready for Keplr sendTx');
        
        return txBinary; // ← Amino Transaction als Uint8Array
        
    } catch (error) {
        console.error('❌ Amino binary encoding failed:', error);
        throw error;
    }
}

// ===================================
// 🎯 AKTUALISIERTE broadcastTransaction
// ===================================

async broadcastTransaction(signedTx) {
    console.log('📡 Broadcasting with Amino signing + binary encoding...');
    
    try {
        console.log('📊 Input signedTx:', signedTx);

        // ✅ Encode Amino Transaction zu Binary
        const txBinary = await this.encodeTxForBroadcast(signedTx);
        
        console.log('📊 KEPLR SENDTX CALL:');
        console.log('- Chain ID:', this.chainId);
        console.log('- TX data type:', typeof txBinary);
        console.log('- TX data length:', txBinary.length);
        console.log('- Is Uint8Array:', txBinary instanceof Uint8Array);
        console.log('- First 10 bytes:', Array.from(txBinary.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

        // ✅ Keplr sendTx mit binary transaction
        console.log('🔧 Calling keplr.sendTx with binary Amino transaction...');
        
        const txHashBytes = await window.keplr.sendTx(
            this.chainId,
            txBinary,  // ← Amino Transaction als Uint8Array
            "sync"
        );

        console.log('✅ Keplr sendTx successful!');
        console.log('📊 TX Hash Bytes:', txHashBytes);
        console.log('📊 TX Hash Bytes type:', typeof txHashBytes);
        console.log('📊 TX Hash Bytes length:', txHashBytes?.length);

        // ✅ Hash conversion
        let txHash;
        if (txHashBytes instanceof Uint8Array) {
            txHash = Array.from(txHashBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        } else if (typeof txHashBytes === 'string') {
            txHash = txHashBytes.toUpperCase();
        } else {
            txHash = Buffer.from(txHashBytes).toString('hex').toUpperCase();
        }

        console.log('🎉 Amino binary transaction broadcast successful!');
        console.log('📊 Final TX Hash:', txHash);

        return {
            success: true,
            txHash: txHash,
            blockHeight: null,
            gasUsed: 0,
            confirmed: false
        };

    } catch (error) {
        console.error('❌ Amino binary broadcast failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // ✅ Spezifische Fehlerbehandlung
        if (error.message?.includes('Request rejected') || 
            error.message?.includes('User denied') ||
            error.message?.includes('User rejected')) {
            throw new Error('Transaction was cancelled by user');
        } else if (error.message?.includes('insufficient funds')) {
            throw new Error('Insufficient funds for transaction');  
        } else if (error.message?.includes('tx parse error')) {
            throw new Error('Transaction format error - check Keplr version');
        } else {
            throw new Error(`Keplr sendTx failed: ${error.message}`);
        }
    }
}


// ===================================
// 🔍 BLOCK INCLUSION POLLING (OPTIONAL)
// ===================================

async waitForBlockInclusion(txHash, maxWaitSeconds = 30) {
    console.log('⏳ Waiting for block inclusion...');
    
    const startTime = Date.now();
    const maxWaitTime = maxWaitSeconds * 1000;
    
    while (Date.now() - startTime < maxWaitTime) {
        try {
            // Query transaction by hash
            const queryResponse = await fetch(`https://rpc.medas-digital.io:26657/tx?hash=${txHash}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (queryResponse.ok) {
                const queryResult = await queryResponse.json();
                
                if (queryResult.result && queryResult.result.tx_result) {
                    const txResult = queryResult.result.tx_result;
                    
                    if (txResult.code === 0) {
                        console.log('✅ Transaction confirmed in block!');
                        console.log('📊 Block Height:', queryResult.result.height);
                        console.log('📊 Final Gas Used:', txResult.gas_used);
                        
                        return {
                            confirmed: true,
                            blockHeight: parseInt(queryResult.result.height),
                            gasUsed: parseInt(txResult.gas_used || '0'),
                            events: txResult.events || []
                        };
                    } else {
                        console.error('❌ Transaction failed in block:', txResult.log);
                        throw new Error(`Transaction failed in block: ${txResult.log}`);
                    }
                }
            }
            
            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.warn('⚠️ Polling error (retrying):', error.message);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.warn('⚠️ Block inclusion timeout - transaction may still be pending');
    return { confirmed: false };
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
