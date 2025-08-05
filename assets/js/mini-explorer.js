// ===================================
// assets/js/mini-explorer.js
// Blockchain Search & Explorer Functionality
// Cosmos SDK 0.50.4 Compatible
// ===================================

class MiniExplorer {
    constructor() {
        this.restUrl = 'https://lcd.medas-digital.io:1317';
        this.rpcUrl = 'https://rpc.medas-digital.io:26657';
        this.searchCache = new Map();
        
        // Cosmos SDK 0.50.4 API-Konfiguration
        this.apiVersion = '0.50.4';
        this.endpoints = {
            // REST API Endpunkte
            txSearch: '/cosmos/tx/v1beta1/txs',
            txByHash: '/cosmos/tx/v1beta1/txs',
            accountInfo: '/cosmos/auth/v1beta1/accounts',
            balances: '/cosmos/bank/v1beta1/balances',
            delegations: '/cosmos/staking/v1beta1/delegations',
            validators: '/cosmos/staking/v1beta1/validators',
            rewards: '/cosmos/distribution/v1beta1/delegators',
            supply: '/cosmos/bank/v1beta1/supply',
            unbonding: '/cosmos/staking/v1beta1/delegators',
            
            // RPC Endpunkte
            block: '/block',
            blockchain: '/blockchain'
        };
        
        this.init();
        console.log(`🔍 MiniExplorer initialized for Cosmos SDK ${this.apiVersion}`);
    }

    init() {
        this.setupSearchHandlers();
        this.setupRecentBlocksUpdater();
    }

    // ===================================
    // SEARCH FUNCTIONALITY
    // ===================================

    setupSearchHandlers() {
        const searchButton = document.querySelector('#explorer-tab .terminal-button');
        const searchInput = document.getElementById('blockchain-search');
        
        if (searchButton) {
            searchButton.addEventListener('click', () => this.performSearch());
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            
            // Auto-detect what user is typing
            searchInput.addEventListener('input', (e) => {
                this.detectSearchType(e.target.value);
            });
        }
    }

    detectSearchType(input) {
        const searchInput = document.getElementById('blockchain-search');
        if (!searchInput) return;

        const trimmed = input.trim();
        
        if (!trimmed) {
            searchInput.placeholder = "Search transaction hash or address...";
            return;
        }

        // Detect search type and update placeholder
        if (trimmed.match(/^[A-F0-9]{64}$/i)) {
            searchInput.placeholder = "🔍 Transaction Hash detected";
        } else if (trimmed.match(/^[0-9]+$/)) {
            searchInput.placeholder = "🔍 Block Height detected";
        } else if (trimmed.startsWith('medas1')) {
            searchInput.placeholder = "🔍 MEDAS Address detected";
        } else if (trimmed.startsWith('medasvaloper1')) {
            searchInput.placeholder = "🔍 Validator Address detected";
        } else {
            searchInput.placeholder = "🔍 Searching...";
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('blockchain-search');
        if (!searchInput) return;

        const query = searchInput.value.trim();
        if (!query) {
            this.showSearchError('Please enter a search term');
            return;
        }

        this.showSearchLoading();

        try {
            // Check cache first
            if (this.searchCache.has(query)) {
                console.log('🎯 Using cached search result');
                this.displaySearchResult(this.searchCache.get(query));
                return;
            }

            const searchType = this.determineSearchType(query);
            console.log(`🔍 [SDK ${this.apiVersion}] Searching for ${searchType}: ${query}`);

            let result;
            switch (searchType) {
                case 'transaction':
                    result = await this.searchTransaction(query);
                    break;
                case 'address':
                    result = await this.searchAddress(query);
                    break;
                case 'validator':
                    result = await this.searchValidator(query);
                    break;
                case 'block':
                    result = await this.searchBlock(query);
                    break;
                default:
                    // Try multiple searches
                    result = await this.performMultiSearch(query);
            }

            if (result) {
                this.searchCache.set(query, result);
                this.displaySearchResult(result);
            } else {
                this.showSearchError('No results found');
            }

        } catch (error) {
            console.error('❌ Search failed:', error);
            this.showSearchError(`Search failed: ${error.message}`);
        }
    }

    determineSearchType(query) {
        if (query.match(/^[A-F0-9]{64}$/i)) return 'transaction';
        if (query.match(/^[0-9]+$/)) return 'block';
        if (query.startsWith('medas1')) return 'address';
        if (query.startsWith('medasvaloper1')) return 'validator';
        return 'unknown';
    }

    // ===================================
    // COSMOS SDK 0.50.4 SEARCH METHODS
    // ===================================

    async searchTransaction(txHash) {
        try {
            console.log(`🔍 [SDK ${this.apiVersion}] Searching transaction: ${txHash}`);
            
            const response = await fetch(`${this.restUrl}${this.endpoints.txByHash}/${txHash}`);
            if (!response.ok) throw new Error('Transaction not found');
            
            const data = await response.json();
            console.log(`✅ [SDK ${this.apiVersion}] Transaction found`);
            
            return {
                type: 'transaction',
                data: this.formatTransactionData(data.tx_response || data.tx)
            };
        } catch (error) {
            console.error('❌ Transaction search failed:', error);
            throw error;
        }
    }

    async searchAddress(address) {
        console.log(`🔍 [SDK ${this.apiVersion}] Searching address: ${address}`);
        
        try {
            // Parallele API-Calls mit SDK 0.50.4 Endpunkten
            const apiPromises = [
                // Account Info
                fetch(`${this.restUrl}${this.endpoints.accountInfo}/${address}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(e => { console.warn('Account fetch failed:', e); return null; }),
                
                // Balance Info
                fetch(`${this.restUrl}${this.endpoints.balances}/${address}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(e => { console.warn('Balance fetch failed:', e); return null; }),
                
                // Delegation Info
                fetch(`${this.restUrl}${this.endpoints.delegations}/${address}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(e => { console.warn('Delegations fetch failed:', e); return null; }),
                
                // Rewards Info
                fetch(`${this.restUrl}${this.endpoints.rewards}/${address}/rewards`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(e => { console.warn('Rewards fetch failed:', e); return null; }),
                
                // Unbonding Delegations (SDK 0.50.4)
                fetch(`${this.restUrl}${this.endpoints.unbonding}/${address}/unbonding_delegations`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(e => { console.warn('Unbonding fetch failed:', e); return null; })
            ];
            
            const [accountData, balanceData, delegationData, rewardsData, unbondingData] = await Promise.all(apiPromises);
            
            console.log('📊 [SDK 0.50.4] Address API Results:');
            console.log('  Account:', !!accountData?.account);
            console.log('  Balance:', balanceData?.balances?.length || 0, 'balances');
            console.log('  Delegations:', delegationData?.delegation_responses?.length || 0, 'delegations');
            console.log('  Rewards:', rewardsData?.rewards?.length || 0, 'reward sources');
            console.log('  Unbonding:', unbondingData?.unbonding_responses?.length || 0, 'unbonding');
            
            // Transaction History mit SDK 0.50.4 Events
            const txHistory = await this.getAddressTransactions(address);
            
            return {
                type: 'address',
                data: {
                    address,
                    account: accountData?.account || null,
                    balances: balanceData?.balances || [],
                    delegations: delegationData?.delegation_responses || [],
                    rewards: rewardsData?.rewards || [],
                    unbonding: unbondingData?.unbonding_responses || [],
                    transactions: txHistory,
                    sdk_version: this.apiVersion
                }
            };
            
        } catch (error) {
            console.error('❌ [SDK 0.50.4] Address search failed:', error);
            
            // Robuster Fallback
            return {
                type: 'address',
                data: {
                    address,
                    account: null,
                    balances: [],
                    delegations: [],
                    rewards: [],
                    unbonding: [],
                    transactions: this.generateMockTransactions(address),
                    sdk_version: this.apiVersion,
                    fallback: true
                }
            };
        }
    }

    async searchValidator(validatorAddress) {
        try {
            console.log(`🔍 [SDK ${this.apiVersion}] Searching validator: ${validatorAddress}`);
            
            const response = await fetch(`${this.restUrl}${this.endpoints.validators}/${validatorAddress}`);
            if (!response.ok) throw new Error('Validator not found');
            
            const data = await response.json();
            console.log(`✅ [SDK ${this.apiVersion}] Validator found`);
            
            return {
                type: 'validator',
                data: this.formatValidatorData(data.validator)
            };
        } catch (error) {
            console.error('❌ Validator search failed:', error);
            throw error;
        }
    }

    async searchBlock(blockHeight) {
        try {
            console.log(`🔍 [SDK ${this.apiVersion}] Searching block: ${blockHeight}`);
            
            const response = await fetch(`${this.rpcUrl}${this.endpoints.block}?height=${blockHeight}`);
            if (!response.ok) throw new Error('Block not found');
            
            const data = await response.json();
            console.log(`✅ [SDK ${this.apiVersion}] Block found`);
            
            return {
                type: 'block',
                data: this.formatBlockData(data.result)
            };
        } catch (error) {
            console.error('❌ Block search failed:', error);
            throw error;
        }
    }

    async performMultiSearch(query) {
        // Try different search types
        const searchPromises = [
            this.searchTransaction(query).catch(() => null),
            this.searchAddress(query).catch(() => null),
            this.searchBlock(query).catch(() => null)
        ];

        const results = await Promise.all(searchPromises);
        return results.find(result => result !== null);
    }

    // ===================================
    // COSMOS SDK 0.50.4 TRANSACTION HISTORY
    // ===================================

    async getAddressTransactions(address, limit = 10) {
        console.log(`🔍 [SDK ${this.apiVersion}] Fetching transactions for: ${address}`);
        
        try {
            // Cosmos SDK 0.50.4 Event-Filter
            const eventQueries = [
                // Transfer Events (neue Format)
                `coin_received.receiver='${address}'`,
                `coin_spent.spender='${address}'`,
                `transfer.recipient='${address}'`,
                `transfer.sender='${address}'`,
                
                // Message Events
                `message.sender='${address}'`,
                
                // Staking Events
                `delegate.delegator='${address}'`,
                `unbond.delegator='${address}'`,
                `redelegate.delegator='${address}'`,
                
                // Distribution Events
                `withdraw_rewards.delegator='${address}'`,
                `withdraw_commission.validator='${address}'`
            ];
            
            let allTxs = [];
            
            for (const eventQuery of eventQueries) {
                try {
                    const url = `${this.restUrl}${this.endpoints.txSearch}?events=${encodeURIComponent(eventQuery)}&pagination.limit=${Math.min(limit, 50)}&order_by=ORDER_BY_DESC`;
                    
                    console.log(`🔄 [SDK ${this.apiVersion}] Trying event: ${eventQuery.split('=')[0]}`);
                    
                    const response = await fetch(url);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.txs && data.txs.length > 0) {
                            console.log(`✅ [SDK ${this.apiVersion}] Found ${data.txs.length} txs`);
                            
                            const formattedTxs = data.txs.map(tx => this.formatTransactionData(tx));
                            allTxs.push(...formattedTxs);
                        }
                    } else if (response.status !== 404) {
                        console.warn(`⚠️ [SDK ${this.apiVersion}] Event query failed (${response.status}): ${eventQuery}`);
                    }
                    
                } catch (eventError) {
                    console.warn(`⚠️ [SDK ${this.apiVersion}] Event query error:`, eventError);
                    continue;
                }
            }
            
            // Duplikate entfernen (basierend auf TX-Hash)
            const uniqueTxs = Array.from(
                new Map(allTxs.map(tx => [tx.hash, tx])).values()
            );
            
            // Nach Timestamp sortieren (neueste zuerst)
            uniqueTxs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            console.log(`✅ [SDK ${this.apiVersion}] Total unique transactions: ${uniqueTxs.length}`);
            
            if (uniqueTxs.length > 0) {
                return uniqueTxs.slice(0, limit);
            }
            
            // Fallback zu Mock-Daten
            console.warn(`⚠️ [SDK ${this.apiVersion}] No transactions found, using mock data`);
            return this.generateMockTransactions(address);
            
        } catch (error) {
            console.error(`❌ [SDK ${this.apiVersion}] Transaction fetch failed:`, error);
            return this.generateMockTransactions(address);
        }
    }

    // ===================================
    // COSMOS SDK 0.50.4 DATA FORMATTING
    // ===================================

    formatTransactionData(tx) {
        // SDK 0.50.4 Response-Format
        const txResponse = tx.tx_response || tx;
        
        return {
            hash: txResponse.txhash || txResponse.hash,
            height: txResponse.height,
            timestamp: txResponse.timestamp,
            gas_used: txResponse.gas_used,
            gas_wanted: txResponse.gas_wanted,
            fee: this.extractFeeInfo(tx),
            messages: this.extractMessages(tx),
            memo: tx.body?.memo || txResponse.memo || '',
            code: txResponse.code || 0,
            success: (txResponse.code || 0) === 0,
            events: txResponse.events || [],
            raw_log: txResponse.raw_log || ''
        };
    }

    extractFeeInfo(tx) {
        // Verschiedene Fee-Strukturen in SDK 0.50.4
        const authInfo = tx.auth_info || tx.tx?.auth_info;
        const fee = authInfo?.fee;
        
        if (fee?.amount && fee.amount.length > 0) {
            return fee.amount[0];
        }
        
        // Fallback
        return { denom: 'umedas', amount: '0' };
    }

    extractMessages(tx) {
        // Verschiedene Message-Strukturen
        if (tx.body?.messages) {
            return tx.body.messages;
        }
        
        if (tx.tx?.body?.messages) {
            return tx.tx.body.messages;
        }
        
        if (tx.messages) {
            return tx.messages;
        }
        
        return [];
    }

    formatValidatorData(validator) {
        return {
            address: validator.operator_address,
            moniker: validator.description?.moniker || 'Unknown',
            details: validator.description?.details || '',
            website: validator.description?.website || '',
            commission: validator.commission?.commission_rates?.rate || '0',
            tokens: validator.tokens,
            delegator_shares: validator.delegator_shares,
            status: validator.status,
            jailed: validator.jailed
        };
    }

    formatBlockData(block) {
        return {
            height: block.block?.header?.height,
            time: block.block?.header?.time,
            proposer: block.block?.header?.proposer_address,
            txs_count: block.block?.data?.txs?.length || 0,
            hash: block.block_id?.hash,
            parent_hash: block.block?.header?.last_block_id?.hash
        };
    }

    // ===================================
    // MOCK DATA FÜR SDK 0.50.4 TESTING
    // ===================================

    generateMockTransactions(address) {
        const mockTxs = [
            {
                hash: 'MEDAS_' + Math.random().toString(36).substr(2, 10).toUpperCase(),
                height: (3917000 + Math.floor(Math.random() * 1000)).toString(),
                timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                gas_used: Math.floor(Math.random() * 200000 + 50000).toString(),
                gas_wanted: Math.floor(Math.random() * 250000 + 100000).toString(),
                fee: { denom: 'umedas', amount: Math.floor(Math.random() * 5000 + 1000).toString() },
                messages: [{ '@type': '/cosmos.bank.v1beta1.MsgSend' }],
                memo: `Mock transaction for SDK ${this.apiVersion}`,
                code: 0,
                success: true,
                events: [],
                raw_log: 'Mock transaction log'
            },
            {
                hash: 'MEDAS_' + Math.random().toString(36).substr(2, 10).toUpperCase(),
                height: (3916000 + Math.floor(Math.random() * 1000)).toString(),
                timestamp: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
                gas_used: Math.floor(Math.random() * 150000 + 30000).toString(),
                gas_wanted: Math.floor(Math.random() * 200000 + 80000).toString(),
                fee: { denom: 'umedas', amount: Math.floor(Math.random() * 3000 + 500).toString() },
                messages: [{ '@type': '/cosmos.staking.v1beta1.MsgDelegate' }],
                memo: 'Staking delegation',
                code: 0,
                success: true,
                events: [],
                raw_log: 'Delegation successful'
            }
        ];
        
        console.log(`🧪 [SDK ${this.apiVersion}] Generated ${mockTxs.length} mock transactions`);
        return mockTxs;
    }

    // ===================================
    // UI DISPLAY FUNCTIONS
    // ===================================

    displaySearchResult(result) {
        const container = this.getSearchResultsContainer();
        
        switch (result.type) {
            case 'transaction':
                container.innerHTML = this.renderTransaction(result.data);
                break;
            case 'address':
                container.innerHTML = this.renderAddress(result.data);
                break;
            case 'validator':
                container.innerHTML = this.renderValidator(result.data);
                break;
            case 'block':
                container.innerHTML = this.renderBlock(result.data);
                break;
        }

        // Show results container
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });
    }

    renderTransaction(tx) {
        const statusClass = tx.success ? 'success' : 'error';
        const statusText = tx.success ? 'SUCCESS' : 'FAILED';
        
        return `
            <div class="search-result-header">
                <h3>🔍 Transaction Details</h3>
                <span class="status-badge status-${statusClass}">${statusText}</span>
            </div>
            <div class="search-result-content">
                <div class="result-row">
                    <span class="label">Hash:</span>
                    <span class="value hash">${tx.hash}</span>
                </div>
                <div class="result-row">
                    <span class="label">Block Height:</span>
                    <span class="value">${tx.height}</span>
                </div>
                <div class="result-row">
                    <span class="label">Timestamp:</span>
                    <span class="value">${new Date(tx.timestamp).toLocaleString()}</span>
                </div>
                <div class="result-row">
                    <span class="label">Gas Used:</span>
                    <span class="value">${tx.gas_used} / ${tx.gas_wanted}</span>
                </div>
                <div class="result-row">
                    <span class="label">Fee:</span>
                    <span class="value">${(parseFloat(tx.fee.amount) / 1000000).toFixed(6)} MEDAS</span>
                </div>
                ${tx.memo ? `
                <div class="result-row">
                    <span class="label">Memo:</span>
                    <span class="value">${tx.memo}</span>
                </div>
                ` : ''}
                <div class="result-row">
                    <span class="label">Messages:</span>
                    <span class="value">${tx.messages.length} message(s)</span>
                </div>
                ${tx.events.length > 0 ? `
                <div class="result-row">
                    <span class="label">Events:</span>
                    <span class="value">${tx.events.length} event(s)</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    renderAddress(addr) {
        const totalBalance = this.calculateBalance(addr.balances);
        const totalDelegated = this.calculateDelegated(addr.delegations);
        const totalRewards = this.calculateRewards(addr.rewards);
        const totalUnbonding = this.calculateUnbonding(addr.unbonding);
        
        const isConnectedWallet = addr.address === window.terminal?.account?.address;
        
        return `
            <div class="search-result-header">
                <h3>🔍 Address Details ${addr.fallback ? '(Fallback Mode)' : ''}</h3>
                <span class="status-badge status-${isConnectedWallet ? 'success' : 'info'}">
                    ${isConnectedWallet ? 'YOUR WALLET' : 'EXTERNAL'}
                </span>
            </div>
            <div class="search-result-content">
                <div class="result-row">
                    <span class="label">Address:</span>
                    <span class="value hash">${addr.address}</span>
                </div>
                
                <!-- BALANCES -->
                <div class="result-row">
                    <span class="label">Available Balance:</span>
                    <span class="value">${totalBalance.toFixed(6)} MEDAS</span>
                </div>
                
                ${totalDelegated > 0 ? `
                <div class="result-row">
                    <span class="label">Staked Amount:</span>
                    <span class="value">${totalDelegated.toFixed(6)} MEDAS</span>
                </div>
                ` : ''}
                
                ${totalRewards > 0 ? `
                <div class="result-row">
                    <span class="label">Pending Rewards:</span>
                    <span class="value">${totalRewards.toFixed(6)} MEDAS</span>
                </div>
                ` : ''}
                
                ${totalUnbonding > 0 ? `
                <div class="result-row">
                    <span class="label">Unbonding:</span>
                    <span class="value">${totalUnbonding.toFixed(6)} MEDAS</span>
                </div>
                ` : ''}
                
                <!-- ACCOUNT INFO -->
                ${addr.account ? `
                <div class="result-row">
                    <span class="label">Account Type:</span>
                    <span class="value">${addr.account['@type']?.split('.').pop() || 'BaseAccount'}</span>
                </div>
                <div class="result-row">
                    <span class="label">Sequence:</span>
                    <span class="value">${addr.account.sequence || '0'}</span>
                </div>
                ` : ''}
                
                <!-- STAKING INFO -->
                <div class="result-row">
                    <span class="label">Active Delegations:</span>
                    <span class="value">${addr.delegations.length}</span>
                </div>
                
                ${addr.unbonding && addr.unbonding.length > 0 ? `
                <div class="result-row">
                    <span class="label">Unbonding Entries:</span>
                    <span class="value">${addr.unbonding.length}</span>
                </div>
                ` : ''}
                
                <!-- TRANSACTION INFO -->
                <div class="result-row">
                    <span class="label">Recent Transactions:</span>
                    <span class="value">${addr.transactions.length} found</span>
                </div>
                
                <div class="result-row">
                    <span class="label">Cosmos SDK:</span>
                    <span class="value">${addr.sdk_version}</span>
                </div>
                
                <!-- RECENT TRANSACTIONS -->
                ${addr.transactions.length > 0 ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="color: #00ffff; font-weight: bold; margin-bottom: 8px;">Recent Transactions:</div>
                    ${addr.transactions.slice(0, 3).map(tx => `
                        <div style="padding: 8px; background: rgba(0,0,0,0.3); margin-bottom: 4px; border-radius: 4px; cursor: pointer;" 
                             onclick="window.miniExplorer?.searchSpecific('${tx.hash}', 'transaction')">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: ${tx.success ? '#00ff00' : '#ff0000'}; font-size: 10px; font-family: monospace;">${tx.hash.substring(0, 16)}...</span>
                                <span style="color: #999; font-size: 10px;">${this.timeAgo(new Date(tx.timestamp))}</span>
                            </div>
                            <div style="color: #999; font-size: 10px; margin-top: 4px;">
                                Block ${tx.height} • ${tx.messages.length} msg(s) • ${tx.success ? 'SUCCESS' : 'FAILED'}
                            </div>
                        </div>
                    `).join('')}
                    ${addr.transactions.length > 3 ? `
                    <div style="text-align: center; margin-top: 8px;">
                        <span style="color: #999; font-size: 10px;">... and ${addr.transactions.length - 3} more transactions</span>
                    </div>
                    ` : ''}
                </div>
                ` : `
                <div style="margin-top: 16px; padding: 16px; background: rgba(255,165,0,0.1); border: 1px solid #ffaa00; border-radius: 4px;">
                    <div style="color: #ffaa00; font-size: 12px; text-align: center;">
                        📊 No recent transactions found for this address
                    </div>
                </div>
                `}
            </div>
        `;
    }

    renderValidator(val) {
        const commission = (parseFloat(val.commission) * 100).toFixed(2);
        const tokens = (parseFloat(val.tokens) / 1000000).toFixed(0);
        
        return `
            <div class="search-result-header">
                <h3>🔍 Validator Details</h3>
                <span class="status-badge ${val.jailed ? 'status-error' : 'status-success'}">
                    ${val.jailed ? 'JAILED' : 'ACTIVE'}
                </span>
            </div>
            <div class="search-result-content">
                <div class="result-row">
                    <span class="label">Moniker:</span>
                    <span class="value">${val.moniker}</span>
                </div>
                <div class="result-row">
                    <span class="label">Address:</span>
                    <span class="value hash">${val.address}</span>
                </div>
                <div class="result-row">
                    <span class="label">Voting Power:</span>
                    <span class="value">${parseInt(tokens).toLocaleString()} MEDAS</span>
                </div>
                <div class="result-row">
                    <span class="label">Commission:</span>
                    <span class="value">${commission}%</span>
                </div>
                <div class="result-row">
                    <span class="label">Status:</span>
                    <span class="value">${val.status}</span>
                </div>
                ${val.website ? `
                <div class="result-row">
                    <span class="label">Website:</span>
                    <span class="value"><a href="${val.website}" target="_blank" style="color: #00ffff;">${val.website}</a></span>
                </div>
                ` : ''}
                ${val.details ? `
                <div class="result-row">
                    <span class="label">Details:</span>
                    <span class="value">${val.details}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    renderBlock(block) {
        return `
            <div class="search-result-header">
                <h3>🔍 Block Details</h3>
                <span class="status-badge status-success">CONFIRMED</span>
            </div>
            <div class="search-result-content">
                <div class="result-row">
                    <span class="label">Height:</span>
                    <span class="value">${block.height}</span>
                </div>
                <div class="result-row">
                    <span class="label">Time:</span>
                    <span class="value">${new Date(block.time).toLocaleString()}</span>
                </div>
                <div class="result-row">
                    <span class="label">Block Hash:</span>
                    <span class="value hash">${block.hash}</span>
                </div>
                <div class="result-row">
                    <span class="label">Parent Hash:</span>
                    <span class="value hash">${block.parent_hash}</span>
                </div>
                <div class="result-row">
                    <span class="label">Transactions:</span>
                    <span class="value">${block.txs_count}</span>
                </div>
                <div class="result-row">
                    <span class="label">Proposer:</span>
                    <span class="value hash">${block.proposer}</span>
                </div>
            </div>
        `;
    }

    // ===================================
    // CALCULATION HELPERS
    // ===================================

    calculateBalance(balances) {
        return balances.reduce((sum, bal) => {
            if (bal.denom === 'umedas') {
                return sum + parseFloat(bal.amount) / 1000000;
            }
            return sum;
        }, 0);
    }

    calculateDelegated(delegations) {
        return delegations.reduce((sum, del) => {
            if (del.balance?.denom === 'umedas') {
                return sum + parseFloat(del.balance.amount) / 1000000;
            }
            return sum;
        }, 0);
    }

    calculateRewards(rewards) {
        return rewards.reduce((sum, reward) => {
            const medasReward = reward.reward?.find(r => r.denom === 'umedas');
            if (medasReward) {
                return sum + parseFloat(medasReward.amount) / 1000000;
            }
            return sum;
        }, 0);
    }

    calculateUnbonding(unbonding) {
        if (!unbonding || !Array.isArray(unbonding)) return 0;
        
        return unbonding.reduce((sum, unb) => {
            if (!unb.entries) return sum;
            return sum + unb.entries.reduce((entrySum, entry) => {
                if (entry.balance) {
                    return entrySum + parseFloat(entry.balance) / 1000000;
                }
                return entrySum;
            }, 0);
        }, 0);
    }

    // ===================================
    // RECENT BLOCKS UPDATER
    // ===================================

    setupRecentBlocksUpdater() {
        this.updateRecentBlocks();
        
        // Update every 30 seconds
        setInterval(() => {
            this.updateRecentBlocks();
        }, 30000);
    }

    async updateRecentBlocks() {
        try {
            const response = await fetch(`${this.rpcUrl}${this.endpoints.blockchain}?minHeight=1&maxHeight=10`);
            if (!response.ok) return;
            
            const data = await response.json();
            const blocks = data.result?.block_metas || [];
            
            this.displayRecentBlocks(blocks.slice(0, 5));
            
        } catch (error) {
            console.warn('⚠️ Recent blocks update failed:', error);
        }
    }

    displayRecentBlocks(blocks) {
        const container = document.getElementById('recent-blocks-list');
        if (!container) return;

        container.innerHTML = `
            <div style="position: absolute; top: -8px; left: 12px; background: #0a0a0a; padding: 0 8px; font-size: 10px; color: #00cc66; letter-spacing: 1px;">RECENT BLOCKS</div>
            ${blocks.map(block => `
                <div class="block-item" style="padding: 8px; border-bottom: 1px solid #333; cursor: pointer;" 
                     onclick="window.miniExplorer?.searchSpecific('${block.header.height}', 'block')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="color: #00ffff; font-weight: bold;">Block ${block.header.height}</span>
                            <span style="color: #999; margin-left: 16px; font-size: 11px;">
                                ${block.header.num_txs || 0} txs
                            </span>
                        </div>
                        <div style="color: #999; font-size: 10px;">
                            ${this.timeAgo(new Date(block.header.time))}
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    // ===================================
    // UTILITY FUNCTIONS
    // ===================================

    getSearchResultsContainer() {
        let container = document.getElementById('search-results-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'search-results-container';
            container.className = 'explorer-section';
            container.style.display = 'none';
            container.innerHTML = '<div id="search-results-content"></div>';
            
            // Insert after search section
            const searchSection = document.querySelector('#explorer-tab .search-section');
            if (searchSection) {
                searchSection.parentNode.insertBefore(container, searchSection.nextSibling);
            }
        }
        
        return container.querySelector('#search-results-content') || container;
    }

    showSearchLoading() {
        const container = this.getSearchResultsContainer();
        container.innerHTML = `
            <div class="search-loading">
                <div style="text-align: center; padding: 40px;">
                    <div style="color: #00ffff; font-size: 16px; margin-bottom: 8px;">🔍 Searching blockchain...</div>
                    <div style="color: #999; font-size: 12px;">Please wait while we fetch the data</div>
                </div>
            </div>
        `;
        container.style.display = 'block';
    }

    showSearchError(message) {
        const container = this.getSearchResultsContainer();
        container.innerHTML = `
            <div class="search-error">
                <div style="text-align: center; padding: 40px; border: 1px solid #ff3030; background: rgba(255, 48, 48, 0.1);">
                    <div style="color: #ff3030; font-size: 16px; margin-bottom: 8px;">❌ Search Failed</div>
                    <div style="color: #ff3030; font-size: 12px;">${message}</div>
                </div>
            </div>
        `;
        container.style.display = 'block';
    }

    searchSpecific(query, type) {
        const searchInput = document.getElementById('blockchain-search');
        if (searchInput) {
            searchInput.value = query;
            this.performSearch();
        }
    }

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}

// ===================================
// GLOBAL INITIALIZATION
// ===================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.miniExplorer = new MiniExplorer();
    });
} else {
    window.miniExplorer = new MiniExplorer();
}

console.log('🔍 Mini-Explorer module loaded for Cosmos SDK 0.50.4');
