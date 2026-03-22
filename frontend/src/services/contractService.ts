import { Contract, ethers } from 'ethers';
import { PestRewardABI } from '../contracts/abis/PestRewardABI';
import { CropInsuranceABI } from '../contracts/abis/CropInsuranceABI';
import { EVM_ADDRESSES, isValidEvmAddress } from '../contracts/addresses';

class HederaProvider extends ethers.BrowserProvider {
  async resolveName(name: string): Promise<string> {
    if (isValidEvmAddress(name) || name.startsWith('0.0.')) {
      return name;
    }
    console.warn(`Returning invalid address as-is: ${name}`);
    return name;
  }
}

class ContractService {
  private pestRewardContract: Contract | null = null;
  private cropInsuranceContract: Contract | null = null;
  private provider: HederaProvider | null = null;

  async initialize(ethereumProvider: any) {
    try {
      this.provider = new HederaProvider(ethereumProvider);
      const signer = await this.provider.getSigner();
      const signerAddress = await signer.getAddress();

      console.log("Initializing with signer address:", signerAddress);
      console.log("PEST_REWARD address:", EVM_ADDRESSES.PEST_REWARD);
      console.log("CROP_INSURANCE address:", EVM_ADDRESSES.CROP_INSURANCE);

      if (!isValidEvmAddress(EVM_ADDRESSES.PEST_REWARD)) {
        throw new Error(`Invalid EVM address for PEST_REWARD: ${EVM_ADDRESSES.PEST_REWARD}`);
      }
      if (!isValidEvmAddress(EVM_ADDRESSES.CROP_INSURANCE)) {
        throw new Error(`Invalid EVM address for CROP_INSURANCE: ${EVM_ADDRESSES.CROP_INSURANCE}`);
      }

      this.pestRewardContract = new Contract(
        EVM_ADDRESSES.PEST_REWARD,
        PestRewardABI,
        signer
      );

      this.cropInsuranceContract = new Contract(
        EVM_ADDRESSES.CROP_INSURANCE,
        CropInsuranceABI,
        signer
      );

      console.log("Contract service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize contracts:", error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return !!this.pestRewardContract && !!this.cropInsuranceContract && !!this.provider;
  }
  async claimRewards(): Promise<string> {
    try {
      if (!this.isInitialized() || !this.pestRewardContract) {
        throw new Error("Contracts not initialized");
      }
      
      console.log("Debug - Contract Methods:");
      console.log("Contract object:", this.pestRewardContract);
      console.log("Available methods:", Object.keys(this.pestRewardContract));
      
      // Check what functions are available
      const contractAsAny = this.pestRewardContract as any;
      console.log("claimRewards exists:", !!contractAsAny.claimRewards);
      console.log("getFarmerReward exists:", !!contractAsAny.getFarmerReward);
      
      if (!contractAsAny.claimRewards) {
        throw new Error("claimRewards function not found. Available functions: " + Object.keys(contractAsAny).join(', '));
      }
      
      // Get the signer
      const signer = await this.provider!.getSigner();
      const contractWithSigner = contractAsAny.connect(signer);
      
      console.log("Calling claimRewards...");
      const tx = await contractWithSigner.claimRewards();
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      
      if (!receipt) throw new Error("Transaction receipt is null");
      
      console.log("Rewards claimed successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Claim rewards failed:", error);
      throw new Error(error.reason || error.message || "Failed to claim rewards");
    }
  }

  async getPendingRewards(): Promise<number> {
    try {
      if (!this.isInitialized()) throw new Error("Contracts not initialized");
      
      const signer = await this.provider!.getSigner();
      const address = await signer.getAddress();
      
      const contract = this.pestRewardContract as Contract & {
        getFarmerReward: (address: string) => Promise<bigint>;
      };
      const rewards = await contract.getFarmerReward(address);
      return Number(ethers.formatUnits(rewards, 8));
    } catch (error: any) {
      console.error("Get pending rewards failed:", error);
      return 0;
    }
  }

  async getRiskScore(): Promise<number> {
    if (!this.isInitialized()) throw new Error("Contracts not initialized");

    const signer = await this.provider!.getSigner();
    const address = await signer.getAddress();

    const contract = this.cropInsuranceContract as Contract & {
      riskScores: (address: string) => Promise<bigint>;
    };

    const riskScore = await contract.riskScores(address);
    return Number(riskScore);
  }

  async calculatePremium(coverageAmount: number): Promise<bigint> {
    if (!this.isInitialized()) throw new Error("Contracts not initialized");

    const signer = await this.provider!.getSigner();
    const address = await signer.getAddress();

    const coverageInTinybars = ethers.parseUnits(coverageAmount.toString(), 8);  

    console.log("Calculating premium for:", {
      farmer: address,
      coverageAmount: coverageInTinybars.toString(),
      coverageInHbar: ethers.formatUnits(coverageInTinybars, 8),
      contractAddress: EVM_ADDRESSES.CROP_INSURANCE
    });

    try {
      const contract = this.cropInsuranceContract as Contract & {
        calculatePremium: (address: string, coverage: bigint, options: { gasLimit: number }) => Promise<bigint>;
      };
      
      const rawCall = await this.provider!.call({
        to: EVM_ADDRESSES.CROP_INSURANCE,
        data: contract.interface.encodeFunctionData('calculatePremium', [address, coverageInTinybars]),
        gasLimit: 300000
      });
      console.log("Raw calculatePremium response:", rawCall);

      const premium = await contract.calculatePremium(
        address,
        coverageInTinybars,
        { gasLimit: 300000 }
      );

      if (premium === 0n) {
        console.warn("Premium returned 0, possible contract logic issue");
      }

      console.log("Premium calculated:", premium.toString(), "tinybars");
      console.log("Premium in HBAR:", ethers.formatUnits(premium, 8));
      return premium;
    } catch (error: any) {
      console.error("Calculate premium failed:", {
        error: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data,
        method: error.info?.method,
        signature: error.info?.signature
      });
      throw new Error(`Failed to calculate premium: ${error.message}`);
    }
  }

  async buyInsurance(coverageAmount: number): Promise<string> {
    if (!this.isInitialized()) throw new Error("Contracts not initialized");

    const signer = await this.provider!.getSigner();
    const address = await signer.getAddress();

    const coverageInTinybars = ethers.parseUnits(coverageAmount.toString(), 8);  
    let premiumInTinybars: bigint;
    
    try {
      premiumInTinybars = await this.calculatePremium(coverageAmount);
    } catch (error) {
      console.error("Failed to calculate premium before buying insurance:", error);
      throw error;
    }

    const premiumInWei = ethers.parseUnits(ethers.formatUnits(premiumInTinybars, 8), 18);  

    console.log("Signer address:", address);
    console.log("Coverage in tinybars:", coverageInTinybars.toString());
    console.log("Coverage in HBAR:", ethers.formatUnits(coverageInTinybars, 8));
    console.log("Premium in tinybars:", premiumInTinybars.toString());
    console.log("Premium in HBAR:", ethers.formatUnits(premiumInTinybars, 8));
    console.log("Premium in wei:", premiumInWei.toString());

    try {
      const balance = await this.getContractBalance();
      if (balance < coverageAmount) {
        console.log("Funding contract with 2 HBAR...");
        await this.fundContract(2);
      }

      const contract = this.cropInsuranceContract as Contract & {
        buyInsurance: (coverage: bigint, options: { value: bigint; gasLimit: bigint }) => Promise<any>;
        getPolicy: (address: string) => Promise<[bigint, bigint, bigint, bigint, boolean, boolean]>;
      };

      // Check for active policy
      const policy = await contract.getPolicy(address);
      console.log("🔍 Policy:", {
        premiumPaid: ethers.formatUnits(policy[0], 8),
        coverageAmount: ethers.formatUnits(policy[1], 8),
        startDate: policy[2].toString(),
        endDate: policy[3].toString(),
        claimedThisSeason: policy[4],
        active: policy[5]
      });

      if (policy[5]) { 
        throw new Error("Wallet already has an active insurance policy");
      }

      // Log available contract functions
      console.log(
        "🔍 Available contract functions:",
        contract.interface.fragments
          .filter(fragment => fragment.type === 'function')
          .map(fragment => (fragment as ethers.FunctionFragment).name)
      );

      if (!contract.interface.getFunction('buyInsurance')) {
        throw new Error("buyInsurance function not found in CropInsurance contract ABI");
      }

      const functionData = contract.interface.encodeFunctionData('buyInsurance', [coverageInTinybars]);
      console.log("🔍 Encoded function data:", functionData);

      let gasLimit: bigint = 300000n;  
      try {
        gasLimit = await this.provider!.estimateGas({
          to: EVM_ADDRESSES.CROP_INSURANCE,
          data: functionData,
          value: premiumInWei,
          from: address
        });
        console.log("Gas estimation succeeded:", gasLimit.toString());
      } catch (error) {
        console.warn("Gas estimation failed, using fallback gas limit of 300000:", error);
      }

      const effectiveGasLimit = (gasLimit * 12n) / 10n;

      console.log("Transaction payload:", {
        to: EVM_ADDRESSES.CROP_INSURANCE,
        value: premiumInWei.toString(),
        gasLimit: effectiveGasLimit.toString(),
      });

      const rawTx = await signer.populateTransaction({
        to: EVM_ADDRESSES.CROP_INSURANCE,
        value: premiumInWei,
        gasLimit: effectiveGasLimit,
        data: functionData
      });
      console.log("Raw transaction:", rawTx);

      // Skip static call
      const tx = await signer.sendTransaction(rawTx);

      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      
      if (!receipt) throw new Error("Transaction receipt is null");
      
      if (receipt.status === 0) {
        throw new Error("Transaction reverted with status 0");
      }

      console.log("Insurance purchased successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Buy insurance failed:", error);
      if (error.reason) console.error("Reason:", error.reason);
      if (error.data) console.error("Error data:", error.data);
      throw new Error(`Failed to purchase insurance: ${error.message}`);
    }
  }

  async fundContract(amountInHbar: number): Promise<string> {
    if (!this.isInitialized()) throw new Error("Contracts not initialized");

    try {
      const signer = await this.provider!.getSigner();
      const address = await signer.getAddress();
      const amountInWei = ethers.parseUnits(amountInHbar.toString(), 18);  

      console.log("Funding contract with:", amountInHbar, "HBAR");
      console.log("Balance before funding:", ethers.formatUnits(await this.provider!.getBalance(address), 18), "HBAR");
      console.log("Transaction value (wei):", amountInWei.toString());
      console.log("Transaction value (HBAR):", ethers.formatUnits(amountInWei, 18));

      const gasLimit = await signer.estimateGas({
        to: EVM_ADDRESSES.CROP_INSURANCE,
        value: amountInWei,
        data: '0x'
      });

      console.log("Funding payload:", {
        to: EVM_ADDRESSES.CROP_INSURANCE,
        value: amountInWei.toString(),
        gasLimit: (gasLimit * 12n) / 10n,
      });

      const rawTx = await signer.populateTransaction({
        to: EVM_ADDRESSES.CROP_INSURANCE,
        value: amountInWei,
        gasLimit: (gasLimit * 12n) / 10n,
        data: '0x'
      });
      console.log("Raw funding transaction:", rawTx);

      const tx = await signer.sendTransaction({
        to: EVM_ADDRESSES.CROP_INSURANCE,
        value: amountInWei,
        gasLimit: (gasLimit * 12n) / 10n,
        data: '0x'
      });

      console.log("Waiting for funding confirmation...");
      const receipt = await tx.wait();
      
      if (!receipt) throw new Error("Transaction receipt is null");
      
      console.log("Contract funded successfully:", receipt.hash);
      console.log("💸 Balance after funding:", ethers.formatUnits(await this.provider!.getBalance(address), 18), "HBAR");
      return receipt.hash;
    } catch (error: any) {
      console.error("Fund contract failed:", error);
      if (error.error) console.error("Error Details:", error.error);
      throw new Error(`Failed to fund contract: ${error.message}`);
    }
  }

  async getInsurancePolicy() {
    try {
      if (!this.isInitialized()) throw new Error("Contracts not initialized");
      
      const signer = await this.provider!.getSigner();
      const address = await signer.getAddress();
      
      console.log("Fetching policy for address:", address);
      
      const policy = await this.cropInsuranceContract!.getPolicy(address);
      
      console.log("Raw policy data:", policy);

      // Extract values safely
      const premiumPaid = parseFloat(ethers.formatUnits(policy[0], 8));
      const coverageAmount = parseFloat(ethers.formatUnits(policy[1], 8));
      const startDate = Number(policy[2]);
      const endDate = Number(policy[3]);
      const claimedThisSeason = Boolean(policy[4]);
      const active = Boolean(policy[5]);
      
      const policyData = {
        premiumPaid,
        coverageAmount,
        startDate,
        endDate,
        claimedThisSeason,
        active
      };
      
      console.log("Processed policy data:", policyData);
      
      return policyData;
      
    } catch (error: any) {
      console.error("❌ Get insurance policy failed:", error);
      return {
        premiumPaid: 0,
        coverageAmount: 0,
        startDate: 0,
        endDate: 0,
        claimedThisSeason: false,
        active: false
      };
    }
  }

  async getPayoutAmount(droughtRisk: string): Promise<number> {
    try {
      if (!this.isInitialized()) throw new Error("Contracts not initialized");
      
      const signer = await this.provider!.getSigner();
      const address = await signer.getAddress();
      const contract = this.cropInsuranceContract as Contract & {
        getPayoutAmount: (address: string, risk: string, options: { gasLimit: number }) => Promise<bigint>;
      };
      const payout = await contract.getPayoutAmount(
        address,
        droughtRisk,
        { gasLimit: 300000 }
      );
      
      return Number(ethers.formatUnits(payout, 18));  
    } catch (error: any) {
      console.error("Get payout amount failed:", error);
      throw new Error(error.reason || error.message || "Failed to get payout amount");
    }
  }

  async getContractBalance(): Promise<number> {
    try {
      if (!this.isInitialized()) throw new Error("Contracts not initialized");
      
      const contract = this.cropInsuranceContract as Contract & {
        getContractBalance: (options: { gasLimit: number }) => Promise<bigint>;
      };
      const balance = await contract.getContractBalance({ gasLimit: 300000 });
      return Number(ethers.formatUnits(balance, 18));  
    } catch (error: any) {
      console.error("Get contract balance failed:", error);
      throw new Error(error.reason || error.message || "Failed to get contract balance");
    }
  }

  async getSigner() {
    if (!this.provider) throw new Error("Provider not initialized");
    return await this.provider.getSigner();
  }
}

export const contractService = new ContractService();