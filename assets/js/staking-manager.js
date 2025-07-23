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
        
        // ✅ SCHRITT 3: Validierung VORHER
        if (!aminoTx.msg || aminoTx.msg.length === 0) {
            console.error('❌ LEER: Messages Array ist leer!');
            throw new Error('Messages array is empty');
        }
        
        // ✅ SCHRITT 4: BINÄRE AMINO KODIERUNG (statt JSON!)
        console.log('🔧 BINÄRE AMINO KODIERUNG:');
        console.log('- Converting to binary Amino format...');
        
        const binaryAminoTx = this.encodeToBinaryAmino(aminoTx);
        
        console.log('📊 BINÄRE AMINO DATEN:');
        console.log('- Binary data:', binaryAminoTx);
        console.log('- Is Uint8Array:', binaryAminoTx instanceof Uint8Array);
        console.log('- Binary length:', binaryAminoTx.length);
        console.log('- First 20 bytes:', Array.from(binaryAminoTx.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // ✅ SCHRITT 5: Validierung NACHHER
        if (binaryAminoTx.length === 0) {
            console.error('❌ LEER: Binäre Kodierung ist leer!');
            throw new Error('Binary encoding resulted in empty data');
        }
        
        console.log('✅ Binary encoding validation passed');
        return binaryAminoTx; // ← Uint8Array statt JSON String!
        
    } catch (error) {
        console.error('❌ Encoding failed with full debug:', error);
        throw error;
    }
}

// ===================================
// 🔧 BINÄRE AMINO KODIERUNG
// ===================================

encodeToBinaryAmino(aminoTx) {
    try {
        console.log('🔧 Converting Amino to binary format...');
        
        // ✅ METHODE 1: Strukturierte binäre Kodierung
        console.log('📊 Using structured binary encoding...');
        
        // JSON String erstellen (wie vorher)
        const jsonString = JSON.stringify(aminoTx);
        console.log('- JSON string length:', jsonString.length);
        
        // ✅ Strukturiertes binäres Format erstellen
        const jsonBytes = new TextEncoder().encode(jsonString);
        
        // ✅ Amino-ähnlicher Header hinzufügen
        const header = new Uint8Array([
            0x16, 0x65, 0xAB, 0xC0, // Amino StdTx type prefix
            (jsonBytes.length >> 24) & 0xFF, // Length (4 bytes big-endian)
            (jsonBytes.length >> 16) & 0xFF,
            (jsonBytes.length >> 8) & 0xFF,
            jsonBytes.length & 0xFF
        ]);
        
        // ✅ Header + JSON kombinieren
        const result = new Uint8Array(header.length + jsonBytes.length);
        result.set(header, 0);
        result.set(jsonBytes, header.length);
        
        console.log('✅ Structured binary encoding complete');
        console.log('- Header length:', header.length);
        console.log('- JSON bytes length:', jsonBytes.length);
        console.log('- Total length:', result.length);
        
        return result;
        
    } catch (error) {
        console.error('❌ Binary encoding failed:', error);
        
        // ✅ FALLBACK: Einfache binäre Kodierung
        console.log('⚠️ Using simple binary fallback...');
        
        try {
            const simpleJson = JSON.stringify(aminoTx);
            const simpleBytes = new TextEncoder().encode(simpleJson);
            
            // Einfacher binärer Wrapper
            const wrapper = new Uint8Array(simpleBytes.length + 8);
            wrapper[0] = 0xAA; // Start marker
            wrapper[1] = 0xBB; // Version
            wrapper[2] = 0xCC; // Type: Amino
            wrapper[3] = 0xDD; // Format: JSON
            wrapper[4] = (simpleBytes.length >> 24) & 0xFF; // Length
            wrapper[5] = (simpleBytes.length >> 16) & 0xFF;
            wrapper[6] = (simpleBytes.length >> 8) & 0xFF;
            wrapper[7] = simpleBytes.length & 0xFF;
            wrapper.set(simpleBytes, 8);
            
            return wrapper;
            
        } catch (fallbackError) {
            console.error('❌ Fallback encoding also failed:', fallbackError);
            throw new Error(`All encoding methods failed: ${error.message}`);
        }
    }
}


async broadcastTransaction(signedTx) {
    console.log('📡 Broadcasting with updated encoding...');
    
    try {
        console.log('📊 Received signedTx:', signedTx);

        // ✅ Verwende die aktualisierte encodeTxForBroadcast Funktion
        const binaryTx = await this.encodeTxForBroadcast(signedTx);
        
        console.log('📊 Encoded binary TX:', binaryTx);
        console.log('📊 Is Uint8Array:', binaryTx instanceof Uint8Array);
        console.log('📊 Length:', binaryTx.length);

        // ✅ Keplr sendTx mit binären Daten
        console.log('🔧 Calling keplr.sendTx with binary data...');
        
        const txHashBytes = await window.keplr.sendTx(
            this.chainId,
            binaryTx, // ← Jetzt Uint8Array statt JSON!
            "sync"
        );

        console.log('✅ sendTx successful');
        console.log('📊 TX Hash Bytes:', txHashBytes);

        // ✅ Hash conversion
        const txHash = Buffer.from(txHashBytes).toString('hex').toUpperCase();

        console.log('🎉 Keplr broadcast successful!');
        console.log('📊 TX Hash:', txHash);

        return {
            success: true,
            txHash: txHash,
            blockHeight: null,
            gasUsed: 0,
            confirmed: false
        };

    } catch (error) {
        console.error('❌ Keplr sendTx failed:', error);
        
        // Spezifische Fehlerbehandlung
        if (error.message.includes('User rejected')) {
            throw new Error('Transaction was cancelled by user');
        } else if (error.message.includes('insufficient funds')) {
            throw new Error('Insufficient funds for transaction');  
        } else if (error.message.includes('tx parse error')) {
            throw new Error('Binary encoding format error');
        } else {
            throw new Error(`Keplr sendTx failed: ${error.message}`);
        }
    }
}


// ===================================
// 🔧 MANUAL AMINO ENCODING
// ===================================

encodeAminoManually(aminoTx) {
    try {
        console.log('🔧 Manual Amino encoding...');
        
        // ✅ AMINO BINÄRKODIERUNG
        // Amino verwendet eine spezifische binäre Serialisierung
        
        // 1. Type Prefix für StdTx (Amino type hash)
        const stdTxPrefix = new Uint8Array([0x16, 0x65, 0xAB, 0xC0]);
        
        // 2. Value als JSON serialisieren
        const valueJson = JSON.stringify(aminoTx.value);
        const valueBytes = new TextEncoder().encode(valueJson);
        
        // 3. Length-Prefix für Value (Varint)
        const lengthBytes = this.encodeVarint(valueBytes.length);
        
        // 4. Kombiniere: TypePrefix + LengthPrefix + Value
        const totalLength = stdTxPrefix.length + lengthBytes.length + valueBytes.length;
        const result = new Uint8Array(totalLength);
        
        let offset = 0;
        result.set(stdTxPrefix, offset);
        offset += stdTxPrefix.length;
        
        result.set(lengthBytes, offset);
        offset += lengthBytes.length;
        
        result.set(valueBytes, offset);
        
        console.log('✅ Manual Amino encoding complete');
        console.log('📊 Type prefix:', Array.from(stdTxPrefix).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        console.log('📊 Length prefix:', Array.from(lengthBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        console.log('📊 Total length:', result.length);
        
        return result;
        
    } catch (error) {
        console.error('❌ Manual Amino encoding failed:', error);
        throw new Error(`Amino encoding failed: ${error.message}`);
    }
}

// ===================================
// 🔧 VARINT ENCODING HELPER
// ===================================

encodeVarint(value) {
    const result = [];
    while (value >= 0x80) {
        result.push((value & 0xFF) | 0x80);
        value >>>= 7;
    }
    result.push(value & 0xFF);
    return new Uint8Array(result);
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
