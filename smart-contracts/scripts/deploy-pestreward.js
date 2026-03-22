const {
    Client,
    PrivateKey,
    ContractCreateFlow,
    ContractFunctionParameters,
    ContractId,
} = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
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

async function getEvmAddress(accountId) {
    const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.evm_address) {
        throw new Error(`No EVM address found for ${accountId}. Ensure this is an ECDSA account.`);
    }
    return data.evm_address;
}

function contractIdToEvmAddress(contractId) {
    return "0x" + ContractId.fromString(contractId).toSolidityAddress();
}

async function main() {
    console.log("Deploying PestReward contract...");

    const operatorId = normalizeEnv(process.env.HEDERA_OPERATOR_ID);
    const operatorKeyRaw = process.env.HEDERA_OPERATOR_PRIVATE_KEY;

    if (!operatorId || !operatorKeyRaw) {
        throw new Error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_PRIVATE_KEY in .env");
    }

    const operatorKey = parseOperatorKey(operatorKeyRaw);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    const asaiDeploymentPath = path.resolve(__dirname, "../deployment.json");
    const asaiDeployment = JSON.parse(fs.readFileSync(asaiDeploymentPath, "utf8"));
    const asaiEvmAddress = contractIdToEvmAddress(asaiDeployment.contractId);
    const backendEvmAddress = await getEvmAddress(operatorId);

    console.log("Operator:", operatorId);
    console.log("ASAI:", asaiDeployment.contractId);
    console.log("Network:", "testnet");

    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/PestReward.sol/PestReward.json");
    const contractData = fs.readFileSync(artifactPath, "utf8");
    const { bytecode } = JSON.parse(contractData);

    const contractCreate = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(1500000)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addAddress(asaiEvmAddress)
                .addAddress(backendEvmAddress)
        );

    const txResponse = await contractCreate.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const contractId = receipt.contractId.toString();
    const txId = txResponse.transactionId.toString();

    const deployment = {
        contractId,
        transactionId: txId,
        asaiContractId: asaiDeployment.contractId,
        asaiTokenAddress: asaiEvmAddress,
        backendAddress: backendEvmAddress,
        operatorId,
        artifactPath,
        gas: 1500000,
        constructor: {
            asaiTokenAddress: asaiEvmAddress,
            backendAddress: backendEvmAddress,
        },
        timestamp: new Date().toISOString(),
        network: "testnet",
    };

    const deploymentPath = path.resolve(__dirname, "../pest-reward-deployment.json");
    writeJson(deploymentPath, deployment);

    console.log("PestReward deployed:", contractId);
    console.log("Tx:", txId);
    console.log("Saved:", deploymentPath);
    console.log("Next:", "node scripts/deploy-insurance.js");
}

main().catch(e => {
    console.error("Deployment failed:", e.message);
    process.exit(1);
});