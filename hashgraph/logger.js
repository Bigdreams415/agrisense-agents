import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@hashgraph/sdk";
import { submitInferenceLog } from "./services/hcs.js";
import { rewardFarmer } from "./services/hts.js";
import { uploadToIPFS } from "./services/ipfs.js";
import { mintPredictionNFT } from "./services/nft.js";
import hederaService from "./services/hedera_service.js";
import { getTopicForLog } from "./agents/hcs_topics.js";
import { parseHederaPrivateKey } from "./utils/hedera_keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const OPERATOR_KEY = parseHederaPrivateKey(process.env.HEDERA_OPERATOR_KEY);

const client = Client.forTestnet().setOperator(
    process.env.HEDERA_OPERATOR_ID,
    OPERATOR_KEY
);

const TOKEN_ID = process.env.UTILITY_TOKEN_ID;
const TOKEN_DECIMALS = Number(process.env.TOKEN_DECIMALS || "2");
const NFT_ENABLED = (process.env.ENABLE_NFT || "true").toLowerCase() === "true";
const NFT_CREATOR = process.env.NFT_CREATOR || "AgriSense AI";


function shouldProcessInsuranceClaim(ndviMean, vegetationHealth, droughtRisk) {
    const ndviPercentage = Math.round(ndviMean * 100);
    const isPoorVegetation = vegetationHealth.toLowerCase() === 'poor';
    const isLowNdvi = ndviPercentage < 20;
    const isDroughtRisk = ['high', 'severe'].includes(droughtRisk.toLowerCase());
    const shouldClaim = isPoorVegetation && isLowNdvi && isDroughtRisk;

    console.log('Insurance eligibility check:', {
        ndviPercentage, isPoorVegetation, isLowNdvi, isDroughtRisk, shouldClaim
    });

    return shouldClaim;
}


export async function submitLog(log) {
    try {
        const topicId = getTopicForLog(log);
        const proof = await submitInferenceLog(client, topicId, log, OPERATOR_KEY);

        let contractResult = { status: "skipped" };
        let contractRewardStatus = "skipped";
        let legacyRewardStatus = "skipped";
        const farmerId = log?.metadata?.farmer_id;

        if (farmerId && TOKEN_ID) {
            try {
                legacyRewardStatus = await rewardFarmer(client, farmerId, TOKEN_ID, 1, TOKEN_DECIMALS);
                console.log(`Rewarded farmer ${farmerId} with 1 ASAI → ${legacyRewardStatus}`);
            } catch (err) {
                legacyRewardStatus = `legacy_failed: ${err.message || err.toString()}`;
                console.warn(`Failed to reward farmer ${farmerId}:`, err?.message ?? err);
            }
        }

        if (log.type === "pest_detection" && farmerId) {
            try {
                const disease = log.result?.disease || "Unknown";
                const confidence = log.result?.confidence || 0;
                const isNonPlant = disease.toLowerCase().includes("non-plant");

                if (!isNonPlant && disease.toLowerCase() !== "healthy") {
                    contractResult = await hederaService.recordPestDetection(
                        farmerId,
                        log.prediction_id,
                        disease,
                        confidence
                    );
                    contractRewardStatus = contractResult.status === "success"
                        ? "bonus_queued_on_contract"
                        : `contract_error: ${contractResult.message}`;
                } else if (isNonPlant) {
                    contractRewardStatus = "skipped_non_plant";
                } else {
                    contractRewardStatus = "skipped_healthy_crop";
                }
            } catch (err) {
                contractRewardStatus = `contract_failed: ${err.message || err.toString()}`;
                console.warn(`Failed contract interaction for ${farmerId}:`, err?.message ?? err);
            }
        } else if (["yield_prediction", "irrigation_recommendation"].includes(log.type)) {
            contractRewardStatus = "skipped_base_only";
        }

        if (log.type === "satellite_imagery" && farmerId) {
            try {
                const result = log.result || {};
                const ndviMean = result.ndvi?.mean || 0;
                const vegetationHealth = result.vegetation_health || "unknown";
                const droughtRisk = result.drought_risk || "unknown";

                const shouldProcessClaim = shouldProcessInsuranceClaim(
                    ndviMean, vegetationHealth, droughtRisk
                );

                const eligibility = await hederaService.checkInsuranceEligibility(farmerId);
                const hasActiveInsurance = eligibility.isEligible;
                const alreadyClaimed = eligibility.policy?.claimedThisSeason;
                const policyActive = eligibility.policy?.active;

                let insuranceScenario = '';
                let insuranceMessage = '';
                let payoutAmount = 0;

                if (!policyActive) {
                    insuranceScenario = 'no_insurance';
                    insuranceMessage = 'No active insurance policy found';
                    contractRewardStatus = 'no_insurance_policy';
                } else if (alreadyClaimed) {
                    insuranceScenario = 'already_claimed';
                    insuranceMessage = 'Already claimed insurance this season';
                    contractRewardStatus = 'already_claimed_this_season';
                } else if (!shouldProcessClaim) {
                    insuranceScenario = 'not_eligible';
                    insuranceMessage = 'Analysis Completed — crops are healthy';
                    contractRewardStatus = 'not_eligible_healthy_crops';
                } else if (hasActiveInsurance && shouldProcessClaim) {
                    insuranceScenario = 'approved';

                    const cleanVegetationHealth = vegetationHealth.trim().toLowerCase();
                    const cleanDroughtRisk = droughtRisk.trim().toLowerCase();

                    contractResult = await hederaService.processInsuranceClaim(
                        farmerId,
                        ndviMean,
                        cleanVegetationHealth,
                        cleanDroughtRisk
                    );

                    if (contractResult.status === "success") {
                        insuranceMessage = 'Insurance claim processed successfully';
                        payoutAmount = contractResult.payoutAmount / 1e8;
                        contractRewardStatus = 'insurance_claim_processed';
                    } else {
                        insuranceMessage = contractResult.message || 'Insurance claim failed';
                        contractRewardStatus = `insurance_failed: ${contractResult.message}`;
                    }
                }

                contractResult.insuranceScenario = insuranceScenario;
                contractResult.insuranceMessage = insuranceMessage;
                contractResult.payoutAmount = payoutAmount;

                console.log(`Insurance scenario: ${insuranceScenario} — ${insuranceMessage}`);

            } catch (err) {
                contractRewardStatus = `insurance_failed: ${err.message || err.toString()}`;
                console.error(`Failed insurance processing for ${farmerId}:`, err?.message ?? err);
                contractResult.insuranceScenario = 'error';
                contractResult.insuranceMessage = err.message || 'Insurance processing failed';
                contractResult.payoutAmount = 0;
            }
        }

        let ipfsCid = null;
        let nftInfo = null;

        try {
            const pred = log ?? {};
            const md = pred.metadata ?? {};
            let hip412;

            if (pred.type === "satellite_imagery") {
                hip412 = {
                    name: `AgriSense Satellite Analysis ${pred.prediction_id ?? md.timestamp ?? ""}`,
                    creator: NFT_CREATOR,
                    description: "Immutable proof of satellite-based vegetation and drought analysis by AgriSense AI.",
                    attributes: [
                        { trait_type: "vegetation_health", value: pred.result?.vegetation_health ?? null },
                        { trait_type: "drought_risk", value: pred.result?.drought_risk ?? null },
                        { trait_type: "ndvi_mean", value: pred.result?.ndvi?.mean ?? null },
                        { trait_type: "ndwi_mean", value: pred.result?.ndwi?.mean ?? null },
                        { trait_type: "farmer_id", value: md.farmer_id ?? null },
                        { trait_type: "agent", value: md.agent ?? "CropWatchAgent" },
                        { trait_type: "timestamp", value: md.timestamp ?? null },
                        { trait_type: "hedera_consensus_timestamp", value: proof?.consensusTimestamp ?? null },
                    ],
                };
            } else if (pred.type === "yield_prediction") {
                hip412 = {
                    name: `AgriSense Yield Prediction ${pred.prediction_id ?? md.timestamp ?? ""}`,
                    creator: NFT_CREATOR,
                    description: "Immutable proof of crop yield prediction by AgriSense AI.",
                    attributes: [
                        { trait_type: "area", value: pred.result?.Area ?? null },
                        { trait_type: "crop_type", value: pred.result?.Crop_Type ?? null },
                        { trait_type: "predicted_yield_hg_ha", value: pred.result?.Predicted_Yield_hg_per_ha ?? null },
                        { trait_type: "farmer_id", value: md.farmer_id ?? null },
                        { trait_type: "timestamp", value: md.timestamp ?? null },
                        { trait_type: "hedera_consensus_timestamp", value: proof?.consensusTimestamp ?? null },
                    ],
                };
            } else if (pred.type === "irrigation_recommendation") {
                hip412 = {
                    name: `AgriSense Irrigation Recommendation ${pred.prediction_id ?? md.timestamp ?? ""}`,
                    creator: NFT_CREATOR,
                    description: "Immutable proof of smart irrigation recommendation by AgriSense AI.",
                    attributes: [
                        { trait_type: "status", value: pred.result?.status ?? null },
                        { trait_type: "recommendation", value: pred.result?.recommendation ?? null },
                        { trait_type: "farmer_id", value: md.farmer_id ?? null },
                        { trait_type: "agent", value: md.agent ?? "DataMarketplaceAgent" },
                        { trait_type: "timestamp", value: md.timestamp ?? null },
                        { trait_type: "hedera_consensus_timestamp", value: proof?.consensusTimestamp ?? null },
                    ],
                };
            } else {
                hip412 = {
                    name: `AgriSense Prediction ${pred.prediction_id ?? md.timestamp ?? ""}`,
                    creator: NFT_CREATOR,
                    description: "Immutable proof of crop-health prediction by AgriSense AI.",
                    attributes: [
                        { trait_type: "crop", value: pred.result?.crop ?? null },
                        { trait_type: "disease", value: pred.result?.disease ?? null },
                        { trait_type: "confidence", value: pred.result?.confidence ?? null },
                        { trait_type: "farmer_id", value: md.farmer_id ?? null },
                        { trait_type: "agent", value: md.agent ?? "AdvisoryAgent" },
                        { trait_type: "advice_source", value: pred.result?.advice_source ?? null },
                        { trait_type: "timestamp", value: md.timestamp ?? null },
                        { trait_type: "hedera_consensus_timestamp", value: proof?.consensusTimestamp ?? null },
                    ],
                };
            }

            ipfsCid = await uploadToIPFS(hip412);

            if (NFT_ENABLED && ipfsCid) {
                try {
                    nftInfo = await mintPredictionNFT(client, log, ipfsCid);
                } catch (err) {
                    console.warn("Failed to mint NFT:", err?.message ?? err);
                    nftInfo = { error: err?.message ?? String(err) };
                }
            }
        } catch (err) {
            console.warn("Failed to upload/mint HIP-412 metadata:", err?.message ?? err);
        }

        return {
            status: "ok",
            proof,
            contractProof: contractResult.transactionId || null,
            legacyRewardStatus,
            contractRewardStatus,
            ipfs_cid: ipfsCid,
            nft: nftInfo,
            contractStatus: contractResult.status,
            insuranceProcessing: {
                scenario: contractResult.insuranceScenario || 'not_processed',
                message: contractResult.insuranceMessage || '',
                payoutAmount: contractResult.payoutAmount || 0,
                transactionId: contractResult.transactionId || null,
            }
        };

    } catch (error) {
        console.error("Failed to submit log:", error?.message ?? error);
        throw error;
    }
}