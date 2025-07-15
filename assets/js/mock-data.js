// MedasDigital WebClient - Mock Data for Development

const MockData = {
    // Validator Data
    validators: [
        { 
            name: "Observatory Node Alpha", 
            commission: "5.0%", 
            apy: "12.4%", 
            status: "Active", 
            voting_power: "4.2M MEDAS",
            address: "medasvaloper1abc123...",
            website: "https://observatory-alpha.io",
            details: "Leading astronomical research validator with 99.9% uptime"
        },
        { 
            name: "Quantum Research Pool", 
            commission: "3.5%", 
            apy: "13.1%", 
            status: "Active", 
            voting_power: "3.8M MEDAS",
            address: "medasvaloper1def456...",
            website: "https://quantum-research.pool",
            details: "Quantum computing research collective"
        },
        { 
            name: "Stellar Computing Cluster", 
            commission: "6.0%", 
            apy: "11.8%", 
            status: "Active", 
            voting_power: "3.1M MEDAS",
            address: "medasvaloper1ghi789...",
            website: "https://stellar-compute.net",
            details: "High-performance computing for stellar analysis"
        },
        { 
            name: "Deep Space Validator", 
            commission: "4.2%", 
            apy: "12.8%", 
            status: "Active", 
            voting_power: "2.9M MEDAS",
            address: "medasvaloper1jkl012...",
            website: "https://deepspace.validator",
            details: "Specialized in deep space observation data"
        },
        { 
            name: "Astronomical Network", 
            commission: "2.8%", 
            apy: "13.5%", 
            status: "Active", 
            voting_power: "2.7M MEDAS",
            address: "medasvaloper1mno345...",
            website: "https://astro.network",
            details: "Global astronomical observatory network"
        },
        { 
            name: "Cosmic Research Node", 
            commission: "5.5%", 
            apy: "12.2%", 
            status: "Active", 
            voting_power: "2.4M MEDAS",
            address: "medasvaloper1pqr678...",
            website: "https://cosmic-research.org",
            details: "Cosmic ray and particle physics research"
        },
        { 
            name: "Planetary Science Pool", 
            commission: "4.8%", 
            apy: "12.6%", 
            status: "Active", 
            voting_power: "2.1M MEDAS",
            address: "medasvaloper1stu901...",
            website: "https://planetary.science",
            details: "Planetary science and exoplanet research"
        },
        { 
            name: "Galactic Computation Hub", 
            commission: "3.2%", 
            apy: "13.3%", 
            status: "Active", 
            voting_power: "1.9M MEDAS",
            address: "medasvaloper1vwx234...",
            website: "https://galactic-compute.hub",
            details: "Distributed galactic simulation computing"
        }
    ],

    // Transaction Data
    transactions: [
        { 
            type: "received", 
            amount: "+125.500000", 
            time: "2 hours ago", 
            hash: "A1B2C3D4E5F6789...",
            from: "medas1researcher01...",
            to: "medas1your_address...",
            memo: "Research collaboration reward",
            fee: "0.002500",
            status: "success"
        },
        { 
            type: "delegate", 
            amount: "-1000.000000", 
            time: "1 day ago", 
            hash: "D4E5F6G7H8I9012...",
            validator: "Observatory Node Alpha",
            memo: "Stake to support astronomical research",
            fee: "0.005000",
            status: "success"
        },
        { 
            type: "sent", 
            amount: "-50.250000", 
            time: "2 days ago", 
            hash: "G7H8I9J0K1L2345...",
            from: "medas1your_address...",
            to: "medas1colleague02...",
            memo: "Equipment purchase contribution",
            fee: "0.002500",
            status: "success"
        },
        { 
            type: "received", 
            amount: "+75.000000", 
            time: "3 days ago", 
            hash: "J1K2L3M4N5O6789...",
            from: "medas1observatory03...",
            to: "medas1your_address...",
            memo: "Observation data verification reward",
            fee: "0.002500",
            status: "success"
        },
        { 
            type: "undelegate", 
            amount: "+500.000000", 
            time: "5 days ago", 
            hash: "M4N5O6P7Q8R9012...",
            validator: "Cosmic Research Node",
            memo: "Unstaking for equipment upgrade",
            fee: "0.005000",
            status: "success"
        },
        { 
            type: "delegate", 
            amount: "-250.000000", 
            time: "1 week ago", 
            hash: "P7Q8R9S0T1U2345...",
            validator: "Quantum Research Pool",
            memo: "Support quantum computing research",
            fee: "0.005000",
            status: "success"
        },
        { 
            type: "received", 
            amount: "+300.750000", 
            time: "1 week ago", 
            hash: "S0T1U2V3W4X5678...",
            from: "medas1grant_foundation...",
            to: "medas1your_address...",
            memo: "Research grant distribution Q1 2025",
            fee: "0.002500",
            status: "success"
        },
        { 
            type: "sent", 
            amount: "-100.000000", 
            time: "2 weeks ago", 
            hash: "V3W4X5Y6Z7A8901...",
            from: "medas1your_address...",
            to: "medas1telescope_pool...",
            memo: "Telescope time booking",
            fee: "0.002500",
            status: "success"
        }
    ],

    // User Delegations
    delegations: [
        {
            validator: "Observatory Node Alpha",
            validator_address: "medasvaloper1abc123...",
            amount: "1250.000000",
            shares: "1250000000",
            rewards: "12.450000",
            commission: "5.0%",
            apy: "12.4%"
        },
        {
            validator: "Quantum Research Pool",
            validator_address: "medasvaloper1def456...",
            amount: "800.000000",
            shares: "800000000",
            rewards: "8.120000",
            commission: "3.5%",
            apy: "13.1%"
        },
        {
            validator: "Astronomical Network",
            validator_address: "medasvaloper1mno345...",
            amount: "500.000000",
            shares: "500000000",
            rewards: "6.750000",
            commission: "2.8%",
            apy: "13.5%"
        }
    ],

    // Chat Contacts
    contacts: [
        {
            address: "medas1researcher01abc...",
            displayName: "Dr. Sarah Chen",
            title: "Astrophysicist",
            institution: "Stellar Observatory Alpha",
            avatar: "👩‍🔬",
            lastSeen: "2 hours ago",
            publicKey: "medaspub1addwnpepq...",
            verified: true
        },
        {
            address: "medas1colleague02def...",
            displayName: "Prof. Marcus Webb",
            title: "Quantum Research Lead",
            institution: "Quantum Computing Institute",
            avatar: "👨‍🔬",
            lastSeen: "1 day ago",
            publicKey: "medaspub1addwnpepq...",
            verified: true
        },
        {
            address: "medas1observatory03ghi...",
            displayName: "Observatory Control",
            title: "Automated System",
            institution: "Deep Space Observatory",
            avatar: "🔭",
            lastSeen: "5 minutes ago",
            publicKey: "medaspub1addwnpepq...",
            verified: true
        },
        {
            address: "medas1telescope_pool...",
            displayName: "Telescope Pool",
            title: "Resource Allocation",
            institution: "Global Telescope Network",
            avatar: "🌌",
            lastSeen: "30 minutes ago",
            publicKey: "medaspub1addwnpepq...",
            verified: true
        },
        {
            address: "medas1grant_foundation...",
            displayName: "Research Grant Foundation",
            title: "Funding Authority",
            institution: "Medas Digital Foundation",
            avatar: "🏛️",
            lastSeen: "1 week ago",
            publicKey: "medaspub1addwnpepq...",
            verified: true
        }
    ],

    // Recent Chat Messages
    messages: [
        {
            id: "msg001",
            from: "medas1researcher01abc...",
            to: "medas1your_address...",
            content: "The new exoplanet data from Sector 7 is fascinating! The atmospheric composition suggests potential habitability.",
            timestamp: "2025-01-15T14:30:00Z",
            type: "text",
            encrypted: true,
            verified: true
        },
        {
            id: "msg002",
            from: "medas1your_address...",
            to: "medas1researcher01abc...",
            content: "Agreed! I'm seeing similar patterns in the spectral analysis. Want to collaborate on the paper?",
            timestamp: "2025-01-15T14:32:00Z",
            type: "text",
            encrypted: true,
            verified: true
        },
        {
            id: "msg003",
            from: "medas1observatory03ghi...",
            to: "broadcast",
            content: "🔭 Observatory Alert: Telescope Array 7 will be offline for maintenance on Jan 16, 02:00-06:00 UTC",
            timestamp: "2025-01-15T12:00:00Z",
            type: "system",
            encrypted: false,
            verified: true
        },
        {
            id: "msg004",
            from: "medas1colleague02def...",
            to: "medas1your_address...",
            content: "The quantum entanglement experiments are showing promising results. Can you review the data when you have time?",
            timestamp: "2025-01-15T10:15:00Z",
            type: "text",
            encrypted: true,
            verified: true
        }
    ],

    // Research Channels
    channels: [
        {
            id: "exoplanet_research",
            name: "Exoplanet Research",
            description: "Discussion and collaboration on exoplanet discoveries",
            members: 147,
            category: "research",
            private: false,
            moderators: ["medas1researcher01abc..."],
            created: "2024-11-15T00:00:00Z"
        },
        {
            id: "quantum_computing",
            name: "Quantum Computing",
            description: "Quantum algorithms and computational astrophysics",
            members: 89,
            category: "technology",
            private: false,
            moderators: ["medas1colleague02def..."],
            created: "2024-12-01T00:00:00Z"
        },
        {
            id: "telescope_scheduling",
            name: "Telescope Scheduling",
            description: "Coordinate observation time and equipment sharing",
            members: 234,
            category: "logistics",
            private: false,
            moderators: ["medas1telescope_pool..."],
            created: "2024-10-20T00:00:00Z"
        },
        {
            id: "planet9_search",
            name: "Planet 9 Search Team",
            description: "Collaborative search for the hypothetical ninth planet",
            members: 67,
            category: "research",
            private: true,
            moderators: ["medas1your_address..."],
            created: "2024-09-15T00:00:00Z"
        }
    ],

    // Network Statistics
    networkStats: {
        totalSupply: "50000000.000000",
        bondedTokens: "34200000.000000",
        bondedRatio: "68.4%",
        inflationRate: "7.2%",
        communityPool: "125000.000000",
        stakingAPR: "12.8%",
        validatorCount: 147,
        activeValidators: 125,
        jailedValidators: 2,
        tombstonedValidators: 0
    },

    // Blockchain Data
    recentBlocks: [
        {
            height: 2847392,
            hash: "B4F7A2E9C1D5...",
            time: "2025-01-15T15:00:00Z",
            proposer: "Observatory Node Alpha",
            txCount: 18,
            gasUsed: "245678",
            gasWanted: "300000"
        },
        {
            height: 2847391,
            hash: "A3E6B1F8D2C4...",
            time: "2025-01-15T14:59:54Z",
            proposer: "Quantum Research Pool",
            txCount: 12,
            gasUsed: "189234",
            gasWanted: "220000"
        },
        {
            height: 2847390,
            hash: "C5D8A2B9E1F7...",
            time: "2025-01-15T14:59:48Z",
            proposer: "Stellar Computing Cluster",
            txCount: 25,
            gasUsed: "356789",
            gasWanted: "400000"
        }
    ],

    // Proposal Data (for governance)
    proposals: [
        {
            id: 15,
            title: "Upgrade Observatory Network Protocol",
            description: "Proposal to upgrade the astronomical data sharing protocol to v2.1",
            status: "voting",
            type: "software_upgrade",
            submitTime: "2025-01-10T00:00:00Z",
            votingStartTime: "2025-01-12T00:00:00Z",
            votingEndTime: "2025-01-19T00:00:00Z",
            yesVotes: "15678456.000000",
            noVotes: "2345123.000000",
            abstainVotes: "567890.000000",
            vetoVotes: "123456.000000"
        },
        {
            id: 14,
            title: "Community Pool Funding for Planet 9 Research",
            description: "Allocate 50,000 MEDAS from community pool for enhanced Planet 9 search efforts",
            status: "passed",
            type: "community_pool_spend",
            submitTime: "2025-01-05T00:00:00Z",
            votingStartTime: "2025-01-07T00:00:00Z",
            votingEndTime: "2025-01-14T00:00:00Z",
            yesVotes: "23456789.000000",
            noVotes: "1234567.000000",
            abstainVotes: "456789.000000",
            vetoVotes: "89012.000000"
        }
    ],

    // Research Projects
    researchProjects: [
        {
            id: "proj_001",
            title: "Exoplanet Atmospheric Analysis",
            description: "Comprehensive study of potentially habitable exoplanet atmospheres",
            lead: "Dr. Sarah Chen",
            participants: 23,
            funding: "75000.000000",
            status: "active",
            progress: 67,
            startDate: "2024-11-01T00:00:00Z",
            expectedCompletion: "2025-04-30T00:00:00Z"
        },
        {
            id: "proj_002",
            title: "Quantum Error Correction for Space Communications",
            description: "Developing quantum error correction protocols for deep space communication",
            lead: "Prof. Marcus Webb",
            participants: 15,
            funding: "125000.000000",
            status: "active",
            progress: 45,
            startDate: "2024-12-15T00:00:00Z",
            expectedCompletion: "2025-08-15T00:00:00Z"
        },
        {
            id: "proj_003",
            title: "Planet 9 Orbital Mechanics Simulation",
            description: "Advanced computational modeling of Planet 9's potential orbit",
            lead: "Observatory Control AI",
            participants: 34,
            funding: "200000.000000",
            status: "planning",
            progress: 12,
            startDate: "2025-02-01T00:00:00Z",
            expectedCompletion: "2025-12-31T00:00:00Z"
        }
    ],

    // System Status Data
    systemStatus: {
        blockchain: {
            status: "online",
            latency: 245,
            syncHeight: 2847392,
            lastUpdate: "2025-01-15T15:00:00Z"
        },
        daemon: {
            status: "offline",
            latency: 0,
            lastUpdate: "2025-01-15T14:30:00Z"
        },
        observatory: {
            status: "standby",
            latency: 1200,
            lastUpdate: "2025-01-15T14:45:00Z"
        },
        quantumRelay: {
            status: "offline",
            latency: 0,
            lastUpdate: "2025-01-15T12:00:00Z"
        }
    }
};

// Helper functions for mock data
const MockDataUtils = {
    // Generate random transaction
    generateRandomTransaction() {
        const types = ['sent', 'received', 'delegate', 'undelegate'];
        const type = types[Math.floor(Math.random() * types.length)];
        const amount = (Math.random() * 1000).toFixed(6);
        const sign = ['sent', 'delegate'].includes(type) ? '-' : '+';
        
        return {
            type: type,
            amount: `${sign}${amount}`,
            time: this.getRandomTimeAgo(),
            hash: this.generateRandomHash(),
            status: 'success'
        };
    },

    // Generate random hash
    generateRandomHash() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result + '...';
    },

    // Get random time ago
    getRandomTimeAgo() {
        const units = [
            { name: 'minute', seconds: 60 },
            { name: 'hour', seconds: 3600 },
            { name: 'day', seconds: 86400 },
            { name: 'week', seconds: 604800 }
        ];
        
        const unit = units[Math.floor(Math.random() * units.length)];
        const count = Math.floor(Math.random() * 10) + 1;
        
        return `${count} ${unit.name}${count > 1 ? 's' : ''} ago`;
    },

    // Get contact by address
    getContactByAddress(address) {
        return MockData.contacts.find(contact => contact.address === address);
    },

    // Get validator by name
    getValidatorByName(name) {
        return MockData.validators.find(validator => validator.name === name);
    },

    // Get random validator
    getRandomValidator() {
        return MockData.validators[Math.floor(Math.random() * MockData.validators.length)];
    },

    // Generate random block
    generateRandomBlock(height) {
        return {
            height: height,
            hash: this.generateRandomHash(),
            time: new Date().toISOString(),
            proposer: this.getRandomValidator().name,
            txCount: Math.floor(Math.random() * 30) + 1,
            gasUsed: Math.floor(Math.random() * 500000).toString(),
            gasWanted: Math.floor(Math.random() * 600000).toString()
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MockData, MockDataUtils };
} else {
    window.MockData = MockData;
    window.MockDataUtils = MockDataUtils;
    console.log('📊 MockData loaded');
}
