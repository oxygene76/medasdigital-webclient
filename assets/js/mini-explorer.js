// ===================================
// assets/js/mini-explorer.js
// Blockchain Search & Explorer Functionality
// ===================================

class MiniExplorer {
    constructor() {
        this.restUrl = 'https://lcd.medas-digital.io:1317';
        this.rpcUrl = 'https://rpc.medas-digital.io:26657';
        this.searchCache = new Map();
        this.init();
        
        console.log('🔍 MiniExplorer initialized');
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
            console.log(`🔍 Searching for ${searchType}: ${query}`);

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
    // SEARCH METHODS
    // ===================================

    async searchTransaction(txHash) {
        try {
            const response = await fetch(`${this.restUrl}/cosmos/tx/v1beta1/txs/${txHash}`);
            if (!response.ok) throw new Error('Transaction not found');
            
            const data = await response.json();
            return {
                type: 'transaction',
                data: this.formatTransactionData(data.tx_response)
            };
        } catch (error) {
            console.error('❌ Transaction search failed:', error);
            throw error;
        }
    }

    async searchAddress(address) {
        try {
            // Get account info and balance
            const [accountResponse, balanceResponse] = await Promise.all([
                fetch(`${this.restUrl}/cosmos/auth/v1beta1/accounts/${address}`).catch(() => null),
                fetch(`${this.restUrl}/cosmos/bank/v1beta1/balances/${address}`).catch(() => null)
            ]);

            let accountData = null;
            let balanceData = null;

            if (accountResponse?.ok) {
                accountData = await accountResponse.json();
            }

            if (balanceResponse?.ok) {
                balanceData = await balanceResponse.json();
            }

            // Get recent transactions
            const txHistory = await this.getAddressTransactions(address);

            return {
                type: 'address',
                data: {
                    address,
                    account: accountData?.account,
                    balances: balanceData?.balances || [],
                    transactions: txHistory
                }
            };
        } catch (error) {
            console.error('❌ Address search failed:', error);
            throw error;
        }
    }

    async searchValidator(validatorAddress) {
        try {
            const response = await fetch(`${this.restUrl}/cosmos/staking/v1beta1/validators/${validatorAddress}`);
            if (!response.ok) throw new Error('Validator not found');
            
            const data = await response.json();
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
            const response = await fetch(`${this.rpcUrl}/block?height=${blockHeight}`);
            if (!response.ok) throw new Error('Block not found');
            
            const data = await response.json();
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
    // DATA FORMATTING
    // ===================================

    formatTransactionData(tx) {
        return {
            hash: tx.txhash,
            height: tx.height,
            timestamp: tx.timestamp,
            gas_used: tx.gas_used,
            gas_wanted: tx.gas_wanted,
            fee: tx.auth_info?.fee?.amount?.[0] || { denom: 'umedas', amount: '0' },
            messages: tx.body?.messages || [],
            memo: tx.body?.memo || '',
            code: tx.code,
            success: tx.code === 0
        };
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
    // ADDRESS TRANSACTION HISTORY
    // ===================================

    async getAddressTransactions(address, limit = 10) {
        try {
            // This is a simplified version - full implementation would need indexer
            const response = await fetch(
                `${this.restUrl}/cosmos/tx/v1beta1/txs?events=transfer.recipient='${address}'&limit=${limit}`
            );
            
            if (!response.ok) return [];
            
            const data = await response.json();
            return (data.txs || []).map(tx => this.formatTransactionData(tx));
            
        } catch (error) {
            console.warn('⚠️ Transaction history fetch failed:', error);
            return [];
        }
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
            </div>
        `;
    }

    renderAddress(addr) {
        const totalBalance = addr.balances.reduce((sum, bal) => {
            if (bal.denom === 'umedas') {
                return sum + parseFloat(bal.amount) / 1000000;
            }
            return sum;
        }, 0);

        return `
            <div class="search-result-header">
                <h3>🔍 Address Details</h3>
            </div>
            <div class="search-result-content">
                <div class="result-row">
                    <span class="label">Address:</span>
                    <span class="value hash">${addr.address}</span>
                </div>
                <div class="result-row">
                    <span class="label">Balance:</span>
                    <span class="value">${totalBalance.toFixed(6)} MEDAS</span>
                </div>
                ${addr.account ? `
                <div class="result-row">
                    <span class="label">Account Type:</span>
                    <span class="value">${addr.account['@type']?.split('.').pop() || 'Unknown'}</span>
                </div>
                <div class="result-row">
                    <span class="label">Sequence:</span>
                    <span class="value">${addr.account.sequence || '0'}</span>
                </div>
                ` : ''}
                <div class="result-row">
                    <span class="label">Recent Transactions:</span>
                    <span class="value">${addr.transactions.length} found</span>
                </div>
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
                ${val.website ? `
                <div class="result-row">
                    <span class="label">Website:</span>
                    <span class="value"><a href="${val.website}" target="_blank">${val.website}</a></span>
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
            const response = await fetch(`${this.rpcUrl}/blockchain?minHeight=1&maxHeight=10`);
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
                                ${block.header.num_txs} txs
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

console.log('🔍 Mini-Explorer module loaded');
