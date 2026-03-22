const {
    Client,
    PrivateKey,
    ContractCreateFlow,
    ContractFunctionParameters,
} = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalizeEnv(value) {
    return (value || "").trim().replace(/^['\"]|['\"]$/g, "");
}

function parseOperatorKey(rawKey) {
    const key = normalizeEnv(rawKey);
    const parserHints = [
        () => PrivateKey.fromStringECDSA(key),
        () => PrivateKey.fromStringED25519(key),
        () => PrivateKey.fromStringDer(key),
        () => PrivateKey.fromString(key),
    ];

    for (const parse of parserHints) {
        try {
            return parse();
        } catch (_) {
            // Try next parser.
        }
    }

    throw new Error("Unable to parse HEDERA_OPERATOR_PRIVATE_KEY. Check key type/format in .env.");
}

async function main() {
    console.log("Deploying CropInsurance contract...");

    const operatorId = normalizeEnv(process.env.HEDERA_OPERATOR_ID);
    const operatorKeyRaw = process.env.HEDERA_OPERATOR_PRIVATE_KEY;

    if (!operatorId || !operatorKeyRaw) {
        throw new Error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_PRIVATE_KEY in .env");
    }

    const operatorKey = parseOperatorKey(operatorKeyRaw);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    const pestDeploymentPath = path.resolve(__dirname, "../pest-reward-deployment.json");
    const pestDeployment = JSON.parse(fs.readFileSync(pestDeploymentPath, "utf8"));
    const backendEvmAddress = pestDeployment.backendAddress;

    console.log("Operator:", operatorId);
    console.log("Backend EVM:", backendEvmAddress);
    console.log("Network:", "testnet");

    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/CropInsurance.sol/CropInsurance.json");
    const contractData = fs.readFileSync(artifactPath, "utf8");
    const { bytecode } = JSON.parse(contractData);

    const contractCreate = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(2000000)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addAddress(backendEvmAddress)
        );

    const txResponse = await contractCreate.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const contractId = receipt.contractId.toString();
    const txId = txResponse.transactionId.toString();

    const deployment = {
        contractId,
        transactionId: txId,
        pestRewardContractId: pestDeployment.contractId,
        backendAddress: backendEvmAddress,
        operatorId,
        artifactPath,
        gas: 2000000,
        constructor: {
            backendAddress: backendEvmAddress,
        },
        timestamp: new Date().toISOString(),
        network: "testnet",
        note: "HBAR-based automated insurance payouts",
    };

    const insuranceDeploymentPath = path.resolve(__dirname, "../insurance-deployment.json");
    writeJson(insuranceDeploymentPath, deployment);

    // Auto-update hashgraph/config.json
    const asaiDeploymentPath = path.resolve(__dirname, "../deployment.json");
    const asaiDeployment = JSON.parse(fs.readFileSync(asaiDeploymentPath, "utf8"));
    const pestRewardDeployment = JSON.parse(fs.readFileSync(pestDeploymentPath, "utf8"));

    const hashgraphConfig = {
        PEST_REWARD_CONTRACT: pestRewardDeployment.contractId,
        CROP_INSURANCE_CONTRACT: contractId,
        ASAI_TOKEN_CONTRACT: asaiDeployment.contractId,
    };

    const configPath = path.resolve(__dirname, "../../hashgraph/config.json");
    writeJson(configPath, hashgraphConfig);

    console.log("CropInsurance deployed:", contractId);
    console.log("Tx:", txId);
    console.log("Saved:", insuranceDeploymentPath);
    console.log("Updated config:", configPath);
    console.log("Contracts:", {
        asai: asaiDeployment.contractId,
        pestReward: pestRewardDeployment.contractId,
        cropInsurance: contractId,
    });
}

main().catch(e => {
    console.error("Deployment failed:", e.message);
    process.exit(1);
});