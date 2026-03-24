const fs = require("fs");
const path = require("path");
const {
    Client,
    PrivateKey,
    ContractId,
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionParameters
} = require("@hashgraph/sdk");
require("dotenv").config();

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseHederaPrivateKey(rawKey) {
    const normalized = (rawKey || "").trim();
    if (!normalized) {
        throw new Error("Operator private key is empty");
    }

    if (normalized.startsWith("0x")) {
        return PrivateKey.fromStringECDSA(normalized.slice(2));
    }

    try {
        return PrivateKey.fromStringECDSA(normalized);
    } catch {
        return PrivateKey.fromString(normalized);
    }
}

async function main() {
    console.log("🔧 Adding PestReward as ASAI minter using Hedera SDK...");

    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY || process.env.HEDERA_OPERATOR_PRIVATE_KEY;
    
    if (!operatorId || !operatorKey) {
        throw new Error("Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY (or HEDERA_OPERATOR_PRIVATE_KEY) in .env file");
    }

    const root = path.resolve(__dirname, "..");
    const asaiDeployment = readJsonIfExists(path.join(root, "deployment.json"));
    const pestDeployment = readJsonIfExists(path.join(root, "pest-reward-deployment.json"));

    const asaiContractId = process.env.ASAI_CONTRACT_ID || asaiDeployment?.contractId;
    const pestRewardContractId = process.env.PEST_REWARD_CONTRACT_ID || pestDeployment?.contractId;

    if (!asaiContractId || !pestRewardContractId) {
        throw new Error("Unable to resolve contract IDs. Set ASAI_CONTRACT_ID and PEST_REWARD_CONTRACT_ID, or ensure deployment JSON files exist.");
    }

    const pestRewardEvmAddress =
        process.env.PEST_REWARD_EVM_ADDRESS ||
        `0x${ContractId.fromString(pestRewardContractId).toSolidityAddress()}`;

    const client = Client.forTestnet();
    const privateKey = parseHederaPrivateKey(operatorKey);
    client.setOperator(operatorId, privateKey);

    console.log("Using operator account:", operatorId);
    console.log("ASAI Contract:", asaiContractId);
    console.log("PestReward Contract:", pestRewardContractId);
    console.log("PestReward EVM Address:", pestRewardEvmAddress);

    try {
        const isMinterQuery = new ContractCallQuery()
            .setContractId(asaiContractId)
            .setGas(150000)
            .setFunction(
                "minters",
                new ContractFunctionParameters().addAddress(pestRewardEvmAddress)
            );

        const before = await isMinterQuery.execute(client);
        const alreadyMinter = before.getBool(0);

        if (alreadyMinter) {
            console.log("✅ PestReward is already a minter. No action needed.");
            return;
        }

        const contractExecTx = new ContractExecuteTransaction()
            .setContractId(asaiContractId)
            .setGas(1000000)
            .setFunction(
                "addMinter",
                new ContractFunctionParameters().addAddress(pestRewardEvmAddress)
            );

        console.log("📝 Executing addMinter transaction...");
        const txResponse = await contractExecTx.execute(client);
        
        console.log("⏳ Waiting for confirmation...");
        const receipt = await txResponse.getReceipt(client);
        
        console.log("✅ Transaction successful!");
        console.log("Status:", receipt.status.toString());
        console.log("Transaction ID:", txResponse.transactionId.toString());

        const after = await isMinterQuery.execute(client);
        console.log("Minter flag after update:", after.getBool(0));

    } catch (error) {
        console.error("❌ Transaction failed:", error.message);
        process.exitCode = 1;
    } finally {
        client.close();
    }
}

main().catch(console.error);