// RewardsCenter.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { contractService } from '../../../services/contractService';
import { useNotification } from '../../../hooks/useNotification';

const RewardsCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rewards' | 'insurance'>('rewards');
  const [pendingRewards, setPendingRewards] = useState(0);
  const [insurancePolicy, setInsurancePolicy] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coverageAmount, setCoverageAmount] = useState(5000);
  const [premiumQuote, setPremiumQuote] = useState(0);
  const [contractsInitialized, setContractsInitialized] = useState(false);
  
  const [claimStatus, setClaimStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [claimMessage, setClaimMessage] = useState<string>('');
  const [lastClaimTx, setLastClaimTx] = useState<string>('');
  const { isConnected, account } = useWallet();
  const { addNotification } = useNotification();

  // Initialize contract service when wallet connects
  useEffect(() => {
    if (isConnected && window.ethereum) {
      const initializeContracts = async () => {
        try {
          await contractService.initialize(window.ethereum);
          setContractsInitialized(true);
          await loadData();
        } catch (error) {
          console.error('Failed to initialize contracts:', error);
          setContractsInitialized(false);
        }
      };
      initializeContracts();
    } else {
      setContractsInitialized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const [transactionStatus, setTransactionStatus] = useState<{
  type: 'success' | 'error' | 'info' | null;
  message: string;
  hash?: string;
  }>({ type: null, message: '' });

  // Debug info
  useEffect(() => {
    if (isConnected && account) {
      console.log("🔗 Frontend wallet connected:", account);
      console.log("📋 Contracts initialized:", contractsInitialized);
    }
  }, [isConnected, account, contractsInitialized]);

  useEffect(() => {
    console.log("🔍 Insurance Policy State:", insurancePolicy);
    if (insurancePolicy) {
      console.log("🔍 Policy Details:", {
        active: insurancePolicy.active,
        coverageAmount: insurancePolicy.coverageAmount,
        premiumPaid: insurancePolicy.premiumPaid,
        hasData: !!insurancePolicy
      });
    }
  }, [insurancePolicy]);

  // Load contract data
  const loadData = useCallback(async () => {
    if (!isConnected || !contractsInitialized) return;
    
    try {
      setIsLoading(true);
      console.log("🔄 Loading contract data...");
      
      const [rewards, policy] = await Promise.all([
        contractService.getPendingRewards(),
        contractService.getInsurancePolicy()
      ]);
        
      console.log("📊 Loaded data:", { rewards, policy });
      console.log("🔍 Policy active status:", policy?.active);
      console.log("🔍 Policy coverage amount:", policy?.coverageAmount);
      
      setPendingRewards(rewards);
      setInsurancePolicy(policy);
      
      // Debug: Check if policy is properly set
      if (policy) {
        console.log("✅ Policy set in state:", {
          active: policy.active,
          coverageAmount: policy.coverageAmount,
          premiumPaid: policy.premiumPaid
        });
      }
      
    } catch (error: any) {
      console.error("❌ Failed to load data:", error);
      addNotification('Failed to load data: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, contractsInitialized, addNotification]);

  // Calculate premium when coverage amount changes
  useEffect(() => {
    if (isConnected && contractsInitialized && coverageAmount > 0) {
      const calculatePremium = async () => {
        try {
          const premium = await contractService.calculatePremium(coverageAmount);
          setPremiumQuote(Number(premium));
        } catch (error) {
          console.error('Premium calculation failed:', error);
        }
      };
      calculatePremium();
    }
  }, [coverageAmount, isConnected, contractsInitialized]);

  // Claim rewards handler
  const handleClaimRewards = async () => {
    if (!isConnected) {
      addNotification('Please connect your wallet first');
      return;
    }

    if (pendingRewards === 0) {
      addNotification('No rewards to claim');
      return;
    }

    try {
      setClaimStatus('loading');
      setClaimMessage('Processing your claim...');
      
      const txHash = await contractService.claimRewards();
      
      setClaimStatus('success');
      setClaimMessage(`Successfully claimed ${pendingRewards} ASAI!`);
      setLastClaimTx(txHash);
      
      // Optional: Also show notification
      addNotification(`🎉 Successfully claimed ${pendingRewards} ASAI!`, 'success');
      
      // Refresh data
      setTimeout(() => {
        loadData();
      }, 2000);
      
    } catch (error: any) {
      setClaimStatus('error');
      setClaimMessage(error.message || 'Failed to claim rewards');
      addNotification('Failed to claim rewards: ' + error.message, 'error');
    }
  };

  // Buy insurance handler
  const handleBuyInsurance = async () => {
    if (!contractService || !isConnected) {
      setTransactionStatus({
        type: 'error',
        message: 'Wallet not connected or contract service unavailable'
      });
      return;
    }

    setIsLoading(true);
    setTransactionStatus({ type: null, message: '' });

    try {
      const txHash = await contractService.buyInsurance(coverageAmount);
      
      setTransactionStatus({
        type: 'success',
        message: 'Insurance purchased successfully! Your crops are now protected.',
        hash: txHash
      });

      if (contractService.getInsurancePolicy) {
        const policy = await contractService.getInsurancePolicy();
        setInsurancePolicy(policy);
      }
      
      // Reset form
      setCoverageAmount(1000);
      
    } catch (error: any) {
      console.error('Insurance purchase error:', error);
      
      let userMessage = 'Failed to purchase insurance. Please try again.';
      
      // Handle specific error cases
      if (error.message.includes('already has an active insurance policy')) {
        userMessage = 'You already have an active insurance policy. Only one policy per wallet is allowed.';
      } else if (error.message.includes('insufficient funds')) {
        userMessage = 'Insufficient HBAR balance. Please add more HBAR to your wallet.';
      } else if (error.message.includes('user rejected')) {
        userMessage = 'Transaction was cancelled.';
      } else if (error.message.includes('gas')) {
        userMessage = 'Transaction failed due to gas issues. Please try again.';
      }
      
      setTransactionStatus({
        type: 'error',
        message: userMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2 gradient-text">Rewards Center</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isConnected ? `Connected: ${account?.slice(0, 8)}...` : 'Please connect your wallet'}
          </p>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-center">Processing transaction...</p>
            </div>
          </div>
        )}

        {/* Stats Cards - REAL DATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pending Rewards Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400">Pending Rewards</h3>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-coins text-green-600"></i>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {isLoading ? '...' : pendingRewards.toFixed(2)} ASAI
            </p>
            {/* Claim Button */}
            <button 
              onClick={handleClaimRewards}
              disabled={!isConnected || pendingRewards === 0 || claimStatus === 'loading'}
              className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claimStatus === 'loading' ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Claiming...
                </>
              ) : (
                `Claim ${pendingRewards} ASAI`
              )}
            </button>

            {/* Success Message */}
            {claimStatus === 'success' && (
              <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                <div className="flex items-center">
                  <i className="fas fa-check-circle text-green-500 mr-2"></i>
                  <span className="text-green-700 font-medium">{claimMessage}</span>
                </div>
                {lastClaimTx && (
                  <div className="mt-2 text-xs text-green-600">
                    Transaction: {lastClaimTx.slice(0, 10)}...{lastClaimTx.slice(-8)}
                    <button 
                      onClick={() => window.open(`https://hashscan.io/testnet/transaction/${lastClaimTx}`, '_blank')}
                      className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                    >
                      View on HashScan
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {claimStatus === 'error' && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                  <span className="text-red-700">{claimMessage}</span>
                </div>
              </div>
            )}

            {/* Loading Message */}
            {claimStatus === 'loading' && (
              <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="flex items-center">
                  <i className="fas fa-spinner fa-spin text-blue-500 mr-2"></i>
                  <span className="text-blue-700">{claimMessage}</span>
                </div>
              </div>
            )}
          </div>
          {/* Insurance Coverage Card*/}
          <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400">Insurance Coverage</h3>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-purple-600"></i>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {insurancePolicy && insurancePolicy.active ? 
                `${insurancePolicy.coverageAmount} HBAR` : '0 HBAR'}
            </p>
            <p className={`text-sm ${insurancePolicy?.active ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {insurancePolicy?.active ? '✅ Active Policy' : 'No coverage'}
            </p>
            {insurancePolicy?.active && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Premium: {insurancePolicy.premiumPaid} HBAR
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-1 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 py-3 px-4 rounded-xl text-center transition-all ${
                activeTab === 'rewards'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <i className="fas fa-award mr-2"></i>
              Rewards Claim
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`flex-1 py-3 px-4 rounded-xl text-center transition-all ${
                activeTab === 'insurance'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <i className="fas fa-shield-alt mr-2"></i>
              Crop Insurance
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          {activeTab === 'rewards' ? (
            <div className="animate-fadeIn">
              <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                <i className="fas fa-gift mr-2"></i>
                Available Rewards
              </h4>
              
              <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-6">
                <div className="font-semibold text-gray-800 dark:text-white">Total Claimable</div>
                <div className="text-2xl font-bold text-green-600">{pendingRewards.toFixed(2)} ASAI</div>
              </div>

              <button 
                onClick={handleClaimRewards}
                disabled={!isConnected || pendingRewards === 0 || isLoading}
                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-download mr-2"></i>
                {isLoading ? 'Processing...' : 'Claim All Rewards'}
              </button>

              {!isConnected && (
                <p className="text-center text-orange-500 mt-4">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Connect your wallet to claim rewards
                </p>
              )}
            </div>
          ) : (
            <div className="animate-fadeIn">
              <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                <i className="fas fa-seedling mr-2"></i>
                Crop Insurance Protection
              </h4>
              
              {insurancePolicy?.active ? (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                  <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                    <i className="fas fa-shield-check mr-2"></i>
                    Active Policy
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Coverage Amount:</span>
                      <span className="font-bold text-green-700 dark:text-green-300">{insurancePolicy.coverageAmount} HBAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Premium Paid:</span>
                      <span className="font-bold text-green-700 dark:text-green-300">{insurancePolicy.premiumPaid} HBAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Policy Start:</span>
                      <span className="font-bold">{new Date(insurancePolicy.startDate * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Policy End:</span>
                      <span className="font-bold">{new Date(insurancePolicy.endDate * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Status:</span>
                      <span className="font-bold text-green-600">ACTIVE</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-green-100 dark:bg-green-800/30 rounded text-center">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ Your crops are protected against drought and poor vegetation
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Coverage Amount (HBAR)
                    </label>
                    <input
                      type="number"
                      value={coverageAmount}
                      onChange={(e) => setCoverageAmount(Number(e.target.value))}
                      min="100"
                      max="100000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {premiumQuote > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">Premium Cost:</span>
                        <span className="text-2xl font-bold text-blue-600">{premiumQuote} tinybars</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {coverageAmount} HBAR coverage × 1% rate
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        💰 Payment will be made in HBAR directly
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={handleBuyInsurance}
                    disabled={!isConnected || isLoading || coverageAmount <= 0}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-shield-alt mr-2"></i>
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Processing...
                      </span>
                    ) : (
                      'Purchase Insurance with HBAR'
                    )}
                  </button>

                  {/* Transaction Status Messages */}
                  {transactionStatus.type && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                      transactionStatus.type === 'success' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : transactionStatus.type === 'error'
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    }`}>
                      <div className="flex items-start">
                        <i className={`fas ${
                          transactionStatus.type === 'success' ? 'fa-check-circle text-green-500' :
                          transactionStatus.type === 'error' ? 'fa-exclamation-circle text-red-500' :
                          'fa-info-circle text-blue-500'
                        } mr-3 mt-1`}></i>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            transactionStatus.type === 'success' ? 'text-green-800 dark:text-green-200' :
                            transactionStatus.type === 'error' ? 'text-red-800 dark:text-red-200' :
                            'text-blue-800 dark:text-blue-200'
                          }`}>
                            {transactionStatus.message}
                          </p>
                          
                          {/* Show transaction hash for success */}
                          {transactionStatus.type === 'success' && transactionStatus.hash && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Transaction Hash:
                              </p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(transactionStatus.hash!);
                                  // Optional: Add a toast notification here
                                }}
                                className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center"
                              >
                                {transactionStatus.hash.slice(0, 10)}...{transactionStatus.hash.slice(-8)}
                                <i className="fas fa-copy ml-2"></i>
                              </button>
                              
                              {/* View on HashScan button */}
                              <button
                                onClick={() => {
                                  const hashscanUrl = `https://hashscan.io/testnet/transaction/${transactionStatus.hash}`;
                                  window.open(hashscanUrl, '_blank');
                                }}
                                className="mt-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors flex items-center"
                              >
                                <i className="fas fa-external-link-alt mr-2"></i>
                                View on HashScan
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Close button for error messages */}
                        {transactionStatus.type === 'error' && (
                          <button
                            onClick={() => setTransactionStatus({ type: null, message: '' })}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!isConnected && (
                    <p className="text-center text-orange-500 mt-4">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      Connect your wallet to purchase insurance
                    </p>
                  )}

                  ``
                  {!isConnected && (
                    <p className="text-center text-orange-500 mt-4">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      Connect your wallet to purchase insurance
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
  );
};

export default RewardsCenter;