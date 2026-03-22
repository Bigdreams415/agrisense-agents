import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
    Client,
    ContractId,
    ContractExecuteTransaction,
    ContractCallQuery,
    ContractFunctionParameters,
    Hbar,
    AccountId
} from "@hashgraph/sdk";
import { parseHederaPrivateKey } from "../utils/hedera_keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

class HederaService {
    constructor() {
        try {
            this.client = Client.forTestnet();
            this.operatorId = process.env.HEDERA_OPERATOR_ID;
            const operatorKeyRaw = process.env.HEDERA_OPERATOR_KEY;

            if (!this.operatorId || !operatorKeyRaw) {
                throw new Error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in hashgraph/.env");
            }

            this.operatorKey = parseHederaPrivateKey(operatorKeyRaw);

            this.client.setOperator(this.operatorId, this.operatorKey);

            const configPath = process.env.CONFIG_PATH || 'config.json';
            const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

            this.pestRewardContract = ContractId.fromString(config.PEST_REWARD_CONTRACT);
            this.cropInsuranceContract = ContractId.fromString(config.CROP_INSURANCE_CONTRACT);
            this.asaiTokenContract = ContractId.fromString(config.ASAI_TOKEN_CONTRACT);

            console.log("HederaService initialized");
            console.log("   PestReward Contract:", this.pestRewardContract.toString());
            console.log("   CropInsurance Contract:", this.cropInsuranceContract.toString());
            console.log("   ASAI Token Contract:", this.asaiTokenContract.toString());

        } catch (error) {
            console.error("Failed to initialize HederaService:", error.message);
            throw error;
        }
    }

    async hederaToEvmAddress(hederaId) {
        try {
            if (hederaId.startsWith('0x') && hederaId.length === 42) return hederaId;

            if (hederaId.startsWith("0.0.")) {
                const mirrorUrl = "https://testnet.mirrornode.hedera.com/api/v1/accounts/" + hederaId;
                const response = await fetch(mirrorUrl);
                const data = await response.json();

                if (data.evm_address) return data.evm_address;

                const accountId = AccountId.fromString(hederaId);
                return "0x" + accountId.toSolidityAddress();
            }

            return hederaId;
        } catch (error) {
            console.error(`Error converting ${hederaId} to EVM address:`, error.message);
            const accountId = AccountId.fromString(hederaId);
            return "0x" + accountId.toSolidityAddress();
        }
    }

    async checkInsuranceEligibility(farmerAddress) {
        try {
            const farmerEvm = await this.hederaToEvmAddress(farmerAddress);
            console.log('Checking insurance eligibility for:', farmerEvm);

            const query = new ContractCallQuery()
                .setContractId(this.cropInsuranceContract)
                .setGas(100000)
                .setFunction("getPolicy", new ContractFunctionParameters().addAddress(farmerEvm))
                .setMaxQueryPayment(Hbar.from(1));

            const response = await query.execute(this.client);

            const policy = {
                premiumPaid: response.getUint256(0),
                coverageAmount: response.getUint256(1),
                startDate: response.getUint256(2),
                endDate: response.getUint256(3),
                claimedThisSeason: response.getBool(4),
                active: response.getBool(5)
            };

            const currentTime = Math.floor(Date.now() / 1000);
            const isPolicyActive = policy.active && currentTime <= policy.endDate;
            const canClaimThisSeason = isPolicyActive && !policy.claimedThisSeason;

            return {
                isEligible: canClaimThisSeason,
                policy,
                status: {
                    hasPolicy: policy.active,
                    policyActive: isPolicyActive,
                    alreadyClaimed: policy.claimedThisSeason,
                    canClaim: canClaimThisSeason,
                    coverageAmount: policy.coverageAmount
                }
            };

        } catch (error) {
            console.error('Failed to check insurance eligibility:', error.message);
            return {
                isEligible: false,
                error: error.message,
                status: {
                    hasPolicy: false,
                    policyActive: false,
                    alreadyClaimed: false,
                    canClaim: false,
                    coverageAmount: 0
                }
            };
        }
    }

    async getPotentialPayoutAmount(farmerAddress, droughtRisk) {
        try {
            const farmerEvm = await this.hederaToEvmAddress(farmerAddress);

            const payoutQuery = new ContractCallQuery()
                .setContractId(this.cropInsuranceContract)
                .setGas(100000)
                .setFunction("getPayoutAmount", new ContractFunctionParameters()
                    .addAddress(farmerEvm)
                    .addString(droughtRisk))
                .setMaxQueryPayment(Hbar.from(1));

            const payoutResponse = await payoutQuery.execute(this.client);
            return payoutResponse.getUint256(0);

        } catch (error) {
            console.error('Failed to get potential payout amount:', error.message);
            return 0;
        }
    }

    async checkContractBalanceAndPayout(farmerAddress, droughtRisk) {
        try {
            const farmerEvm = await this.hederaToEvmAddress(farmerAddress);

            const balanceQuery = new ContractCallQuery()
                .setContractId(this.cropInsuranceContract)
                .setGas(100000)
                .setFunction("getContractBalance", new ContractFunctionParameters())
                .setMaxQueryPayment(Hbar.from(1));

            const balanceResponse = await balanceQuery.execute(this.client);
            const contractBalance = balanceResponse.getUint256(0);

            const payoutQuery = new ContractCallQuery()
                .setContractId(this.cropInsuranceContract)
                .setGas(100000)
                .setFunction("getPayoutAmount", new ContractFunctionParameters()
                    .addAddress(farmerEvm)
                    .addString(droughtRisk))
                .setMaxQueryPayment(Hbar.from(1));

            const payoutResponse = await payoutQuery.execute(this.client);
            const payoutAmount = payoutResponse.getUint256(0);

            return {
                contractBalance,
                payoutAmount,
                hasSufficientFunds: contractBalance >= payoutAmount
            };
        } catch (error) {
            console.error('Failed to check contract balance:', error.message);
            return { contractBalance: 0, payoutAmount: 0, hasSufficientFunds: false };
        }
    }

    async checkBackendPermissions() {
        try {
            const query = new ContractCallQuery()
                .setContractId(this.cropInsuranceContract)
                .setGas(100000)
                .setFunction("backend", new ContractFunctionParameters())
                .setMaxQueryPayment(Hbar.from(1));

            const response = await query.execute(this.client);
            let contractBackendAddress = response.getAddress(0);
            const ourEvmAddress = await this.hederaToEvmAddress(this.operatorId);

            if (!contractBackendAddress.startsWith('0x')) {
                contractBackendAddress = '0x' + contractBackendAddress;
            }

            return contractBackendAddress.toLowerCase() === ourEvmAddress.toLowerCase();
        } catch (error) {
            console.error('Failed to check backend permissions:', error.message);
            return false;
        }
    }

    async processInsuranceClaim(farmerId, ndviMean, vegetationHealth, droughtRisk) {
        try {
            console.log('Processing insurance claim for farmer:', farmerId);

            const farmerEvm = await this.hederaToEvmAddress(farmerId);
            const potentialPayout = await this.getPotentialPayoutAmount(farmerId, droughtRisk);

            if (potentialPayout === 0) throw new Error('No payout available for this drought risk level');

            const balanceInfo = await this.checkContractBalanceAndPayout(farmerId, droughtRisk);
            if (!balanceInfo.hasSufficientFunds) {
                throw new Error(`Insufficient contract funds. Balance: ${balanceInfo.contractBalance/1e8} HBAR, Required: ${balanceInfo.payoutAmount/1e8} HBAR`);
            }

            const eligibility = await this.checkInsuranceEligibility(farmerId);
            if (!eligibility.isEligible) throw new Error('Insurance policy not eligible');

            const hasBackendPermission = await this.checkBackendPermissions();
            if (!hasBackendPermission) throw new Error('Current account lacks backend permissions');

            const ndviPercentage = Math.round(ndviMean * 100);

            const transaction = new ContractExecuteTransaction()
                .setContractId(this.cropInsuranceContract)
                .setGas(2000000)
                .setFunction(
                    "processInsuranceClaim",
                    new ContractFunctionParameters()
                        .addAddress(farmerEvm)
                        .addUint256(ndviPercentage)
                        .addString(vegetationHealth)
                        .addString(droughtRisk)
                )
                .setMaxTransactionFee(Hbar.from(10));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);

            if (receipt.status.toString() !== "SUCCESS") {
                throw new Error(`Claim failed: ${receipt.status.toString()}`);
            }

            console.log(`Insurance claim processed — TX: ${txResponse.transactionId.toString()}`);

            return {
                status: "success",
                transactionId: txResponse.transactionId.toString(),
                receiptStatus: receipt.status.toString(),
                payoutAmount: potentialPayout,
                potentialPayoutHBAR: potentialPayout / 1e8
            };

        } catch (error) {
            console.error("Insurance claim failed:", error.message);
            return {
                status: "error",
                message: error.message,
                transactionId: null,
                payoutAmount: 0,
            };
        }
    }

    async recordPestDetection(farmerId, predictionId, pestType, confidence) {
        try {
            const farmerEvm = await this.hederaToEvmAddress(farmerId);
            const confidencePercent = Math.floor(confidence * 100);

            const transaction = new ContractExecuteTransaction()
                .setContractId(this.pestRewardContract)
                .setGas(1000000)
                .setFunction(
                    "recordPestDetection",
                    new ContractFunctionParameters()
                        .addAddress(farmerEvm)
                        .addString(predictionId)
                        .addString(pestType)
                        .addUint256(confidencePercent)
                )
                .setMaxTransactionFee(Hbar.from(2));

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);

            if (receipt.status.toString() !== "SUCCESS") {
                throw new Error(`Transaction failed: ${receipt.status.toString()}`);
            }

            console.log(`Pest detection recorded — TX: ${txResponse.transactionId.toString()}`);

            return {
                status: "success",
                transactionId: txResponse.transactionId.toString(),
                receiptStatus: receipt.status.toString()
            };

        } catch (error) {
            console.error("Failed to record pest detection:", error.message);
            return { status: "error", message: error.message, transactionId: null };
        }
    }

    async getFarmerRewards(farmerId) {
        try {
            const farmerEvm = await this.hederaToEvmAddress(farmerId);

            const query = new ContractCallQuery()
                .setContractId(this.pestRewardContract)
                .setGas(100000)
                .setFunction("getFarmerReward", new ContractFunctionParameters().addAddress(farmerEvm))
                .setMaxQueryPayment(Hbar.from(1));

            const response = await query.execute(this.client);
            const rewardAmount = response.getUint256(0);

            return {
                status: "success",
                farmerId,
                rewardAmount,
                rewardAsa: Number(rewardAmount) / Math.pow(10, 8)
            };

        } catch (error) {
            console.error("Failed to get farmer rewards:", error.message);
            return { status: "error", message: error.message };
        }
    }

    async getInsurancePolicy(farmerId) {
        try {
            const farmerEvm = await this.hederaToEvmAddress(farmerId);

            const query = new ContractCallQuery()
                .setContractId(this.cropInsuranceContract)
                .setGas(100000)
                .setFunction("getPolicy", new ContractFunctionParameters().addAddress(farmerEvm))
                .setMaxQueryPayment(Hbar.from(1));

            const response = await query.execute(this.client);

            const policy = {
                premiumPaid: response.getUint256(0),
                coverageAmount: response.getUint256(1),
                startDate: response.getUint256(2),
                endDate: response.getUint256(3),
                claimedThisSeason: response.getBool(4),
                active: response.getBool(5)
            };

            return { status: "success", farmerId, policy };

        } catch (error) {
            console.error("Failed to get insurance policy:", error.message);
            return { status: "error", message: error.message };
        }
    }
}

const hederaService = new HederaService();
export default hederaService;