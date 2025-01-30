import Web3 from 'web3';

export const isPolygonAddress = (address: string) => {
    const polygonRegex = /^(0x)?[0-9a-fA-F]{40}$/;
    return polygonRegex.test(address);
};

export const web3Provider = (chainId: number) => {
    const apiKey = process.env.INFURA_API_KEY;
    switch (chainId) {
        case 1: // ethereum-mainnet
            return new Web3(`https://mainnet.infura.io/v3/${apiKey}`);

        case 137: // polygon-mainnet
            return new Web3(`https://polygon-mainnet.infura.io/v3/${apiKey}`);

        case 8453: // base-mainnet
            return new Web3(`https://base-mainnet.infura.io/v3/${apiKey}`);

        case 11155111: // ethereum-sepolia-testnet
            return new Web3(`https://sepolia.infura.io/v3/${apiKey}`);

        case 80002: // polygon-amoy-testnet
            return new Web3(`https://polygon-amoy.infura.io/v3/${apiKey}`);

        default:
            return new Web3(`https://mainnet.infura.io/v3/${apiKey}`);
    }
};
