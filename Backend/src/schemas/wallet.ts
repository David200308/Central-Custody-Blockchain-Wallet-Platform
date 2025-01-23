export type RequestSignSchema = {
    value: number;
    to: string;
    nonce: number;
    type: number;
    chainId: number;
    gas: number;
    maxFeePerGas: number;
    maxPriorityFeePerGas: number;
} | {
    message: string;
};
