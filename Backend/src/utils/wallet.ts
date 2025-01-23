export const isPolygonAddress = (address: string) => {
    const polygonRegex = /^(0x)?[0-9a-fA-F]{40}$/;
    return polygonRegex.test(address);
};
