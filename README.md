# 🌌 Medas Digital Web Client v0.9

> Advanced blockchain interface for astronomical research collaboration with Planet 9 visualization

[![Live Demo](https://img.shields.io/badge/Live-Demo-00ffff?style=for-the-badge)](https://yourusername.github.io/medas-digital-webclient)
[![MIT License](https://img.shields.io/badge/License-MIT-00ff00?style=for-the-badge)](LICENSE)
[![Keplr Compatible](https://img.shields.io/badge/Keplr-Compatible-ff00ff?style=for-the-badge)](https://www.keplr.app/)

## ✨ Features

🔮 **Quantum Wallet Integration**

- Keplr wallet authentication
- Medas Digital blockchain support
- Secure quantum-encrypted transactions

🔍 **Advanced Block Explorer**

- Real-time blockchain scanning
- Transaction search & analysis
- Network statistics dashboard

🥩 **Intelligent Staking Interface**

- Validator selection & delegation
- Rewards management & claiming
- APY calculations & forecasting

👛 **Professional Wallet Management**

- Token transfers & balance tracking
- Transaction history & filtering
- Multi-asset portfolio overview

💬 **Real-time Chat System**

- Daemon API integration
- WebSocket real-time messaging
- Contact management
- Payment channel support

🌌 **Scientific Visualization**

- Accurate Planet 9 orbital mechanics
- Trans-Neptunian Object tracking
- Real-time solar system animation
- Scientifically correct proportions

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)

1. Fork this repository
1. Enable GitHub Pages in Settings
1. Visit `https://yourserver/medasdigital-webclient`

### Option 2: Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/medasdigital-webclient.git
cd medasdigital-webclient

# Start development server
python -m http.server 8000
# or
npx live-server
```

### Option 3: Docker Deployment with Daemon

```bash
# Start full stack with medas digital daemon
docker-compose up -d

# Access at http://localhost:8080
```

## 🔗 Daemon Integration

The web client connects to the medas digital daemon for advanced features:

### Daemon API Endpoints

- **Status**: `GET http://localhost:8080/api/v1/status`
- **Messages**: `POST http://localhost:8080/api/v1/messages/send`
- **History**: `GET http://localhost:8080/api/v1/messages/history`
- **Contacts**: `GET http://localhost:8080/api/v1/contacts`
- **Channels**: `GET http://localhost:8080/api/v1/channels`
- **WebSocket**: `ws://localhost:8080/ws/messages`

### Start Daemon

```bash
# Option 1: Docker (Recommended)
docker run -d --name medas-digital-daemon \
  -p 8080:8080 \
  -v ~/.medas-digital:/data \
  medas-digital/daemon:latest

# Option 2: Docker Compose
docker-compose up -d daemon
```

## 📖 Features Documentation

### Blockchain Integration

- **Chain**: Medas Digital (medasdigital-1)
- **RPC**: https://rpc.medas-digital.io:26657
- **REST**: https://api.medas-digital.io:1317
- **Token**: MEDAS (6 decimals)

### Chat System

- Real-time messaging via WebSocket
- Contact management and history
- Payment channels for micropayments
- Multi-relay support with geographic routing

### Block Explorer

- Live block monitoring with network statistics
- Transaction search by hash or address
- Wallet history for connected accounts

### Staking Interface

- Validator selection with APY calculations
- Delegation management with rewards tracking
- Quick stake/unstake functionality

## 🎨 Design Features

- **80s Retro Sci-Fi Aesthetic** with neon effects
- **Animated Solar System** with Planet 9 orbital mechanics
- **Responsive Design** for desktop and mobile
- **Terminal-style Interface** for scientific authenticity

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Blockchain**: Cosmos SDK, Keplr Wallet
- **Styling**: Orbitron & Share Tech Mono fonts, CSS Grid
- **Backend**: Medas Digital Daemon (Docker)
- **Deployment**: GitHub Pages, Docker, Netlify

## 🚀 Development Status

- ✅ **Blockchain Integration**: Complete
- ✅ **Keplr Wallet**: Complete
- ✅ **Daemon API**: Complete (client-side)
- ✅ **Tab System**: Complete (Explorer, Staking, Wallet)
- ✅ **Real-time Chat**: Complete (client-side)
- 🔄 **Daemon Implementation**: In development

## 🤝 Contributing

We welcome contributions! Please see <CONTRIBUTING.md> for guidelines.

## 📄 License

This project is licensed under the MIT License - see <LICENSE> file for details.

## 🔗 Links

- [Live Demo](https://yourusername.github.io/medas-digital-webclient)
- [Medas Digital Website](https://medas-digital.io)
- [Keplr Wallet](https://www.keplr.app/)
- [Cosmos Network](https://cosmos.network/)

⭐ Star this repo if you find it useful!
