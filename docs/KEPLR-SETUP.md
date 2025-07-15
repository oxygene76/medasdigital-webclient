# Keplr Wallet Setup Guide - MedasDigital WebClient

## 📱 Installation

### Browser Extension
1. Visit [keplr.app](https://www.keplr.app/)
2. Click "Install Keplr for [Your Browser]"
3. Add extension to Chrome/Firefox/Edge
4. Pin extension to browser toolbar

### Mobile App
1. Download from App Store/Google Play
2. Search "Keplr - Cosmos Wallet"
3. Install official app
4. Open and follow setup wizard

## 🔑 Initial Wallet Setup

### Create New Wallet
1. Click Keplr extension icon
2. Select "Create new account"
3. **⚠️ CRITICAL: Securely store your seed phrase**
   - Write on paper, store in safe place
   - Never store digitally
   - Never share with anyone
4. Set strong password
5. Confirm account creation

### Import Existing Wallet
1. Click Keplr extension
2. Select "Import existing account" 
3. Enter your 12/24 word seed phrase
4. Set password
5. Confirm import

## ⚙️ MedasDigital Chain Setup

### Automatic Setup (Recommended)
1. Open MedasDigital WebClient
2. Click "Connect Wallet" button
3. Keplr will prompt to add MedasDigital chain
4. Click "Approve" in Keplr popup
5. Chain is automatically configured

### Manual Chain Addition
If automatic setup fails, add manually:

1. Open Keplr extension
2. Click Settings (⚙️ icon)
3. Select "Manage Chain Visibility"
4. Click "Add Chain" button
5. Enter chain configuration:

**Chain Details:**
```
Chain ID: medasdigital-2
Chain Name: MedasDigital
RPC Endpoint: https://rpc.medas-digital.io:26657
REST Endpoint: https://api.medas-digital.io:1317
```

**Advanced Configuration:**
```json
{
  "chainId": "medasdigital-2",
  "chainName": "MedasDigital",
  "rpc": "https://rpc.medas-digital.io:26657",
  "rest": "https://api.medas-digital.io:1317",
  "bip44": {
    "coinType": 118
  },
  "bech32Config": {
    "bech32PrefixAccAddr": "medas",
    "bech32PrefixAccPub": "medaspub",
    "bech32PrefixValAddr": "medasvaloper",
    "bech32PrefixValPub": "medasvaloperpub",
    "bech32PrefixConsAddr": "medasvalcons",
    "bech32PrefixConsPub": "medasvalconspub"
  },
  "currencies": [{
    "coinDenom": "MEDAS",
    "coinMinimalDenom": "umedas",
    "coinDecimals": 6,
    "coinGeckoId": "medasdigital"
  }],
  "feeCurrencies": [{
    "coinDenom": "MEDAS",
    "coinMinimalDenom": "umedas",
    "coinDecimals": 6
  }],
  "stakeCurrency": {
    "coinDenom": "MEDAS",
    "coinMinimalDenom": "umedas",
    "coinDecimals": 6
  }
}
```

## 🔗 Using with MedasDigital WebClient

### First Connection
1. Open MedasDigital WebClient
2. Click "Connect Wallet" in top-right
3. Keplr popup appears
4. Click "Approve" to connect
5. Your medas-address and balance appear

### Account Management
- **Switch Accounts**: Click Keplr → Select different account
- **View Balance**: Displayed in WebClient header
- **Refresh**: WebClient auto-updates every 30 seconds

### Disconnecting
1. Click wallet address in WebClient
2. Select "Disconnect Wallet"
3. Or disable site permissions in Keplr settings

## 💰 Wallet Operations

### Receiving MEDAS
1. Click wallet address to copy
2. Share your `medas1...` address
3. Tokens appear automatically in WebClient

### Sending MEDAS
1. Go to "WALLET" tab in WebClient
2. Click "Send" button
3. Enter recipient address
4. Enter amount
5. Confirm in Keplr popup

### Staking MEDAS
1. Go to "STAKE" tab in WebClient
2. Select validator
3. Enter delegation amount
4. Confirm transaction in Keplr

## 🔒 Security Best Practices

### Seed Phrase Security
- ✅ **Write on paper** - Never digital storage
- ✅ **Multiple copies** - Store in different safe locations
- ✅ **Verify backup** - Test recovery before using
- ❌ **Never share** - Not with anyone, ever
- ❌ **No photos** - Don't take pictures
- ❌ **No cloud storage** - Never store online

### Daily Security
- Keep Keplr extension updated
- Only connect to trusted websites
- Review transactions before signing
- Use hardware wallet for large amounts
- Enable auto-lock in Keplr settings
- Log out of shared computers

### Transaction Safety
- **Double-check addresses** - One wrong character = lost funds
- **Verify amounts** - Check decimal places
- **Check gas fees** - Ensure reasonable
- **Read transaction details** - Before confirming

## 🚨 Troubleshooting

### Keplr Not Detected in WebClient
```
1. Check extension is installed and enabled
2. Refresh WebClient page
3. Try incognito/private browsing mode
4. Disable other wallet extensions temporarily
5. Restart browser
```

### Chain Not Appearing
```
1. Try automatic setup first (click Connect Wallet)
2. Add chain manually using configuration above
3. Check internet connection
4. Verify RPC endpoints are accessible
5. Contact support if persistent
```

### Transaction Failures
```
1. Check sufficient MEDAS balance for transaction + fees
2. Verify gas settings (usually auto-calculated)
3. Check network congestion (try again later)
4. Ensure recipient address is correct format
5. Try increasing gas limit slightly
```

### Connection Issues
```
1. Refresh WebClient page
2. Click "Connect Wallet" again
3. Clear browser cache
4. Check Keplr permissions for the site
5. Try different browser
```

### Balance Not Updating
```
1. Wait 30 seconds (auto-refresh interval)
2. Refresh browser page manually
3. Check transaction completed on blockchain
4. Verify correct network selected in Keplr
```

## 📱 Mobile Usage

### Keplr Mobile App
- Full wallet functionality
- QR code scanning for addresses
- Push notifications for transactions
- Biometric authentication support

### Mobile Browser Integration
- Use Keplr mobile browser
- Or copy addresses manually
- Limited functionality compared to extension

## 🛠️ Advanced Features

### Multiple Accounts
- Create multiple accounts in one Keplr instance
- Switch between accounts as needed
- Each account has unique medas-address

### Hardware Wallet Integration
- Ledger Nano S/X support
- Enhanced security for large amounts
- Setup through Keplr settings

### Custom Networks
- Add testnets for development
- Switch between mainnet/testnet
- Separate balances and transaction history

## 🔄 Recovery & Backup

### Account Recovery
1. Install Keplr on new device/browser
2. Select "Import existing account"
3. Enter your seed phrase
4. Set new password
5. Account and balance restored

### Backup Verification
Test recovery process with small amounts before trusting with large funds.

## 📞 Support Resources

### Self-Help
- [Keplr Documentation](https://docs.keplr.app/)
- Browser console for error messages
- This setup guide

### Official Support
- [Keplr Support](https://help.keplr.app/)
- MedasDigital community channels
- GitHub issues for WebClient problems

**Remember: Your seed phrase is your wallet. Keep it safe! 🔐**
