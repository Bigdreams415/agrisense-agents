import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNotification } from '../hooks/useNotification';
import { MirrorNodeService } from '../services/mirrorNode';

interface WalletContextType {
  account: string | null; // EVM address (0x...)
  accountId: string | null; // Hedera account ID (0.0.x)
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isResolvingAccount: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const { addNotification } = useNotification();

  // Load from localStorage on mount
  useEffect(() => {
    const savedAccountId = localStorage.getItem('hederaAccountId');
    const savedAccount = localStorage.getItem('evmAddress');
    
    if (savedAccountId && savedAccount) {
      setAccountId(savedAccountId);
      setAccount(savedAccount);
      setIsConnected(true);
    }
  }, []);

  const resolveAccountId = useCallback(async (evmAddress: string): Promise<string | null> => {
    setIsResolvingAccount(true);
    try {
      const resolvedAccountId = await MirrorNodeService.resolveAccountId(evmAddress);

      if (resolvedAccountId) {
        localStorage.setItem('hederaAccountId', resolvedAccountId);
        localStorage.setItem('evmAddress', evmAddress);
        setAccountId(resolvedAccountId);
        addNotification(`Hedera Account: ${resolvedAccountId}`, 'success');
        return resolvedAccountId;
      } else {
        addNotification('No Hedera account found for this wallet');
        return null;
      }
    } catch (error) {
      console.error('Error resolving account ID:', error);
      addNotification('Failed to resolve Hedera account ID', 'error');
      return null;
    } finally {
      setIsResolvingAccount(false);
    }
  }, [addNotification]);

  const checkWalletConnection = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          await resolveAccountId(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  }, [resolveAccountId]);

  useEffect(() => {
    checkWalletConnection();
  }, [checkWalletConnection]);

  const switchToHederaNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x128' }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x128',
                chainName: 'Hedera Testnet',
                nativeCurrency: {
                  name: 'HBAR',
                  symbol: 'HBAR',
                  decimals: 8 // Corrected to 8 decimals for HBAR
                },
                rpcUrls: ['https://testnet.rpc.hedera.com'], // Reliable RPC
                blockExplorerUrls: ['https://hashscan.io/testnet']
              }
            ]
          });
        } catch (addError) {
          console.error('Error adding Hedera network:', addError);
          addNotification('Failed to add Hedera network', 'error');
        }
      } else {
        console.error('Error switching to Hedera network:', switchError);
        addNotification('Error switching to Hedera network', 'error');
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        setAccount(accounts[0]);
        setIsConnected(true);
        addNotification('Wallet connected successfully!', 'success');
        
        await resolveAccountId(accounts[0]);
        await switchToHederaNetwork();
        
      } catch (error) {
        console.error('Error connecting wallet:', error);
        addNotification('Failed to connect wallet', 'error');
      }
    } else {
      addNotification('Please install MetaMask!', 'error');
    }
  };

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setAccountId(null);
    setIsConnected(false);
    localStorage.removeItem('hederaAccountId');
    localStorage.removeItem('evmAddress');
    addNotification('Wallet disconnected', 'info');
  }, [addNotification]);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          resolveAccountId(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [account, disconnectWallet, resolveAccountId]);

  return (
    <WalletContext.Provider value={{
      account,
      accountId,
      isConnected,
      connectWallet,
      disconnectWallet,
      isResolvingAccount
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};