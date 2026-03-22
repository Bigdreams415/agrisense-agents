export const CONTRACT_ADDRESSES = {
  PEST_REWARD: "0.0.6915678",
  CROP_INSURANCE: "0.0.6915696",
} as const;

export const EVM_ADDRESSES = {
  PEST_REWARD: "0x000000000000000000000000000000000069865e",
  CROP_INSURANCE: "0x0000000000000000000000000000000000698670",
} as const;

export function isValidHederaAddress(address: string): boolean {
  return /^0\.0\.\d+$/.test(address);
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function formatHederaAddress(address: string): string {
  if (isValidHederaAddress(address)) {
    return address;
  }
  if (isValidEvmAddress(address)) {
    console.warn(`Cannot convert EVM address ${address} to Hedera format without MirrorNodeService`);
    return address;
  }
  return address;
}

export function formatEvmAddress(address: string): string {
  if (isValidEvmAddress(address)) {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }
  if (isValidHederaAddress(address)) {
    console.warn(`Cannot convert Hedera address ${address} to EVM format without conversion logic`);
    return address;
  }
  return address;
}

// Debug logging
console.log('Contract Addresses:');
console.log('PEST_REWARD (Hedera):', CONTRACT_ADDRESSES.PEST_REWARD, '-> (EVM):', EVM_ADDRESSES.PEST_REWARD);
console.log('CROP_INSURANCE (Hedera):', CONTRACT_ADDRESSES.CROP_INSURANCE, '-> (EVM):', EVM_ADDRESSES.CROP_INSURANCE);
console.log('EVM Address Validation:');
console.log('PEST_REWARD valid EVM:', isValidEvmAddress(EVM_ADDRESSES.PEST_REWARD));
console.log('CROP_INSURANCE valid EVM:', isValidEvmAddress(EVM_ADDRESSES.CROP_INSURANCE));