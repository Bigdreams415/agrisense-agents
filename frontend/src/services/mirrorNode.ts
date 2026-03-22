export interface MirrorNodeResponse {
  account: string;
  alias?: string;
  balance: { balance: number };
  evm_address?: string;
}

export class MirrorNodeService {
  private static readonly MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";
  private static readonly MAINNET_MIRROR_NODE_URL = "https://mainnet-public.mirrornode.hedera.com";

  private static formatEvmAddressForMirrorNode(evmAddress: string): string {
    let formatted = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress;
    return formatted.toLowerCase();
  }

  static async getAccountIdFromEvmAddress(evmAddress: string, isTestnet: boolean = true): Promise<string | null> {
    try {
      const formattedAddress = this.formatEvmAddressForMirrorNode(evmAddress);
      const baseUrl = isTestnet ? this.MIRROR_NODE_URL : this.MAINNET_MIRROR_NODE_URL;
      
      const response = await fetch(`${baseUrl}/api/v1/accounts/${formattedAddress}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Mirror node error: ${response.status}`);
      }

      const data: MirrorNodeResponse = await response.json();
      return data.account || null;
    } catch (error) {
      console.error('Error fetching from mirror node:', error);
      return null;
    }
  }

  static async getEvmAddressFromAccountId(accountId: string, isTestnet: boolean = true): Promise<string | null> {
    try {
      const baseUrl = isTestnet ? this.MIRROR_NODE_URL : this.MAINNET_MIRROR_NODE_URL;
      const response = await fetch(`${baseUrl}/api/v1/accounts/${accountId}`);
      
      if (!response.ok) {
        throw new Error(`Mirror node error: ${response.status}`);
      }

      const data: MirrorNodeResponse = await response.json();
      return data.evm_address || null;
    } catch (error) {
      console.error('Error fetching from mirror node:', error);
      return null;
    }
  }

  static async getAccountIdFromHashscan(evmAddress: string): Promise<string | null> {
    try {
      const formattedAddress = this.formatEvmAddressForMirrorNode(evmAddress);
      const response = await fetch(`https://hashscan.io/testnet/api/accounts?address=0x${formattedAddress}`);
      
      if (!response.ok) {
        throw new Error(`Hashscan error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.[0]?.account || null;
    } catch (error) {
      console.error('Error fetching from Hashscan:', error);
      return null;
    }
  }

  static async resolveAccountId(evmAddress: string): Promise<string | null> {
    // Try mirror node first (primary method)
    const accountId = await this.getAccountIdFromEvmAddress(evmAddress);
    
    if (accountId) {
      return accountId;
    }

    // If mirror node fails, try Hashscan as fallback
    const hashscanAccountId = await this.getAccountIdFromHashscan(evmAddress);
    
    if (hashscanAccountId) {
      return hashscanAccountId;
    }

    // If both methods fail, return null 
    return null;
  }
}