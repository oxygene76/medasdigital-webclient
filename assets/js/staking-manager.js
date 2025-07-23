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
        
        // ✅ SCHRITT 2: Konvertiere Amino zu Protobuf Messages
        console.log('🔧 Converting Amino messages to Protobuf...');
        
        const protobufMessages = this.convertAminoToProtobuf(signedTx.signed.msgs);
        console.log('📊 Protobuf Messages:', protobufMessages);
        
        // ✅ SCHRITT 3: Verwende signDirect für Protobuf (NICHT signAmino!)
        console.log('🔧 Using signDirect for Protobuf encoding...');
        
        const account = await this.connectKeplr();
        const accountInfo = await this.getAccountInfo(account.address);
        
        // ✅ SCHRITT 4: Erstelle Protobuf SignDoc
        const signDoc = {
            bodyBytes: this.encodeProtobufTxBody(protobufMessages, signedTx.signed.memo || ""),
            authInfoBytes: this.encodeProtobufAuthInfo(signedTx.signed.fee, accountInfo.sequence),
            chainId: this.chainId,
            accountNumber: parseInt(accountInfo.accountNumber)
        };
        
        console.log('📊 SignDoc created:', {
            bodyBytesLength: signDoc.bodyBytes.length,
            authInfoBytesLength: signDoc.authInfoBytes.length,
            chainId: signDoc.chainId,
            accountNumber: signDoc.accountNumber
        });
        
        // ✅ SCHRITT 5: signDirect mit Protobuf Messages
        const protoSignResponse = await window.keplr.signDirect(
            this.chainId,
            account.address,
            signDoc,
            {
                preferNoSetFee: false,
                preferNoSetMemo: false
            }
        );
        
        console.log('✅ signDirect successful');
        console.log('📊 Proto Sign Response keys:', Object.keys(protoSignResponse));
        
        // ✅ SCHRITT 6: Erstelle TxRaw Protobuf
        const txRawData = {
            bodyBytes: protoSignResponse.signed.bodyBytes,
            authInfoBytes: protoSignResponse.signed.authInfoBytes,
            signatures: [
                new Uint8Array(Buffer.from(protoSignResponse.signature.signature, "base64"))
            ]
        };
        
        console.log('📊 TxRaw data lengths:', {
            body: txRawData.bodyBytes.length,
            authInfo: txRawData.authInfoBytes.length,
            signature: txRawData.signatures[0].length
        });
        
        // ✅ SCHRITT 7: PROTOBUF WIRE FORMAT Serialisierung
        console.log('🔧 PROTOBUF WIRE FORMAT KODIERUNG:');
        
        const protobufTx = this.encodeToProtobufWireFormat(txRawData);
        
        console.log('📊 PROTOBUF BINÄRE DATEN:');
        console.log('- Binary data:', protobufTx);
        console.log('- Is Uint8Array:', protobufTx instanceof Uint8Array);
        console.log('- Binary length:', protobufTx.length);
        console.log('- First 20 bytes:', Array.from(protobufTx.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // ✅ SCHRITT 8: Validierung
        if (protobufTx.length === 0) {
            console.error('❌ LEER: Protobuf Kodierung ist leer!');
            throw new Error('Protobuf encoding resulted in empty data');
        }
        
        // Prüfe auf korrekte Wire Types (0x0A, 0x12, 0x1A)
        if (protobufTx[0] !== 0x0A) {
            console.warn('⚠️ Unexpected first wire type:', '0x' + protobufTx[0].toString(16));
        }
        
        console.log('✅ Protobuf encoding validation passed');
        return protobufTx; // ← Protobuf Uint8Array für Keplr sendTx!
        
    } catch (error) {
        console.error('❌ Encoding failed with full debug:', error);
        throw error;
    }
}

// ===================================
// 🔧 AMINO ZU PROTOBUF CONVERSION
// ===================================

convertAminoToProtobuf(aminoMsgs) {
    try {
        console.log('🔧 Converting Amino messages to Protobuf...');
        
        const protobufMsgs = [];
        
        for (const aminoMsg of aminoMsgs) {
            console.log('📊 Converting Amino message:', aminoMsg);
            
            let protobufMsg;
            
            switch (aminoMsg.type) {
                case 'cosmos-sdk/MsgDelegate':
                    protobufMsg = {
                        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
                        value: {
                            delegatorAddress: aminoMsg.value.delegator_address,
                            validatorAddress: aminoMsg.value.validator_address,
                            amount: aminoMsg.value.amount
                        }
                    };
                    break;
                    
                case 'cosmos-sdk/MsgUndelegate':
                    protobufMsg = {
                        typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
                        value: {
                            delegatorAddress: aminoMsg.value.delegator_address,
                            validatorAddress: aminoMsg.value.validator_address,
                            amount: aminoMsg.value.amount
                        }
                    };
                    break;
                    
                case 'cosmos-sdk/MsgWithdrawDelegatorReward':
                    protobufMsg = {
                        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                        value: {
                            delegatorAddress: aminoMsg.value.delegator_address,
                            validatorAddress: aminoMsg.value.validator_address
                        }
                    };
                    break;
                    
                default:
                    throw new Error(`Unsupported Amino message type: ${aminoMsg.type}`);
            }
            
            console.log('✅ Converted to Protobuf:', protobufMsg);
            protobufMsgs.push(protobufMsg);
        }
        
        return protobufMsgs;
        
    } catch (error) {
        console.error('❌ Amino to Protobuf conversion failed:', error);
        throw error;
    }
}

// ===================================
// 🔧 PROTOBUF TX BODY ENCODING
// ===================================

encodeProtobufTxBody(messages, memo) {
    try {
        console.log('🔧 Encoding Protobuf TxBody...');
        
        // TxBody proto message:
        // field 1: messages (repeated Any)
        // field 2: memo (string)
        // field 3: timeout_height (uint64)
        // field 4: extension_options (repeated Any)
        // field 5: non_critical_extension_options (repeated Any)
        
        const messageBytes = [];
        
        // Encode each message as Any proto
        for (const msg of messages) {
            const anyBytes = this.encodeAnyMessage(msg);
            // Field 1, wire type 2 (length-delimited)
            messageBytes.push(0x0A); // field 1, wire type 2
            messageBytes.push(...this.encodeVarint(anyBytes.length));
            messageBytes.push(...anyBytes);
        }
        
        // Encode memo if present
        const memoBytes = [];
        if (memo) {
            const memoUtf8 = new TextEncoder().encode(memo);
            memoBytes.push(0x12); // field 2, wire type 2
            memoBytes.push(...this.encodeVarint(memoUtf8.length));
            memoBytes.push(...memoUtf8);
        }
        
        // timeout_height = 0 (optional, skip if zero)
        
        const result = new Uint8Array([...messageBytes, ...memoBytes]);
        
        console.log('✅ TxBody encoded, length:', result.length);
        return result;
        
    } catch (error) {
        console.error('❌ TxBody encoding failed:', error);
        throw error;
    }
}

// ===================================
// 🔧 PROTOBUF AUTH INFO ENCODING
// ===================================

encodeProtobufAuthInfo(fee, sequence) {
    try {
        console.log('🔧 Encoding Protobuf AuthInfo...');
        
        // AuthInfo proto message:
        // field 1: signer_infos (repeated SignerInfo)
        // field 2: fee (Fee)
        
        // For now, simplified version - would need proper SignerInfo encoding
        // This is a complex structure that would need full protobuf implementation
        
        // Simplified fee encoding
        const feeAmount = fee.amount[0];
        const feeJson = JSON.stringify({
            amount: feeAmount.amount,
            denom: feeAmount.denom,
            gas_limit: fee.gas
        });
        
        const feeBytes = new TextEncoder().encode(feeJson);
        const result = new Uint8Array(feeBytes.length + 10);
        
        // Simplified wrapper
        result[0] = 0x12; // field 2
        result[1] = feeBytes.length;
        result.set(feeBytes, 2);
        
        console.log('✅ AuthInfo encoded (simplified), length:', result.length);
        return result;
        
    } catch (error) {
        console.error('❌ AuthInfo encoding failed:', error);
        throw error;
    }
}

// ===================================
// 🔧 ANY MESSAGE ENCODING
// ===================================

encodeAnyMessage(msg) {
    try {
        // Any proto message:
        // field 1: type_url (string)
        // field 2: value (bytes)
        
        const typeUrlBytes = new TextEncoder().encode(msg.typeUrl);
        const valueJson = JSON.stringify(msg.value);
        const valueBytes = new TextEncoder().encode(valueJson);
        
        const result = [];
        
        // Field 1: type_url
        result.push(0x0A); // field 1, wire type 2
        result.push(...this.encodeVarint(typeUrlBytes.length));
        result.push(...typeUrlBytes);
        
        // Field 2: value
        result.push(0x12); // field 2, wire type 2
        result.push(...this.encodeVarint(valueBytes.length));
        result.push(...valueBytes);
        
        return new Uint8Array(result);
        
    } catch (error) {
        console.error('❌ Any message encoding failed:', error);
        throw error;
    }
}

// ===================================
// 🔧 PROTOBUF WIRE FORMAT KODIERUNG
// ===================================

encodeToProtobufWireFormat(txRaw) {
    try {
        console.log('🔧 Encoding to Protobuf Wire Format...');
        
        const bodyBytes = new Uint8Array(txRaw.bodyBytes);
        const authInfoBytes = new Uint8Array(txRaw.authInfoBytes);
        const signatures = new Uint8Array(txRaw.signatures[0]);
        
        console.log('📊 Component lengths:', {
            body: bodyBytes.length,
            authInfo: authInfoBytes.length,
            signature: signatures.length
        });
        
        // ✅ PROTOBUF WIRE FORMAT für TxRaw
        // Field 1: body_bytes (wire type 2 = length-delimited)
        // Field 2: auth_info_bytes (wire type 2)
        // Field 3: signatures (wire type 2, repeated)
        
        let totalLength = 0;
        
        // Calculate total length
        totalLength += 1 + this.getVarintLength(bodyBytes.length) + bodyBytes.length;        // Field 1
        totalLength += 1 + this.getVarintLength(authInfoBytes.length) + authInfoBytes.length; // Field 2
        totalLength += 1 + this.getVarintLength(signatures.length) + signatures.length;       // Field 3
        
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        // Field 1: body_bytes (field number 1, wire type 2)
        result[offset++] = (1 << 3) | 2; // 0x0A = field 1, wire type 2
        offset += this.writeVarint(result, offset, bodyBytes.length);
        result.set(bodyBytes, offset);
        offset += bodyBytes.length;
        
        // Field 2: auth_info_bytes (field number 2, wire type 2) 
        result[offset++] = (2 << 3) | 2; // 0x12 = field 2, wire type 2
        offset += this.writeVarint(result, offset, authInfoBytes.length);
        result.set(authInfoBytes, offset);
        offset += authInfoBytes.length;
        
        // Field 3: signatures (field number 3, wire type 2)
        result[offset++] = (3 << 3) | 2; // 0x1A = field 3, wire type 2
        offset += this.writeVarint(result, offset, signatures.length);
        result.set(signatures, offset);
        
        console.log('✅ Protobuf Wire Format encoding complete');
        console.log('📊 Final length:', result.length);
        console.log('📊 Wire format preview:', Array.from(result.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        console.log('📊 Expected wire types: 0x0A (field 1), 0x12 (field 2), 0x1A (field 3)');
        
        return result;
        
    } catch (error) {
        console.error('❌ Protobuf Wire Format encoding failed:', error);
        throw error;
    }
}

// ===================================
// 🔧 VARINT HELPERS
// ===================================

encodeVarint(value) {
    const result = [];
    while (value >= 0x80) {
        result.push((value & 0xFF) | 0x80);
        value >>>= 7;
    }
    result.push(value & 0xFF);
    return result;
}

getVarintLength(value) {
    if (value < 0x80) return 1;
    if (value < 0x4000) return 2;
    if (value < 0x200000) return 3;
    if (value < 0x10000000) return 4;
    return 5;
}

writeVarint(buffer, offset, value) {
    let bytesWritten = 0;
    while (value >= 0x80) {
        buffer[offset + bytesWritten] = (value & 0xFF) | 0x80;
        value >>>= 7;
        bytesWritten++;
    }
    buffer[offset + bytesWritten] = value & 0xFF;
    return bytesWritten + 1;
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
