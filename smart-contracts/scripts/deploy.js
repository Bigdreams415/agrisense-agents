const { Client, PrivateKey, ContractCreateFlow, ContractFunctionParameters } = require("@hashgraph/sdk");
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
    console.log("Deploying ASAI token contract...");

    const operatorId = normalizeEnv(process.env.HEDERA_OPERATOR_ID);
    const operatorKeyRaw = process.env.HEDERA_OPERATOR_PRIVATE_KEY;

    if (!operatorId || !operatorKeyRaw) {
        throw new Error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_PRIVATE_KEY in .env");
    }

    const operatorKey = parseOperatorKey(operatorKeyRaw);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    console.log("Operator:", operatorId);
    console.log("Network:", "testnet");

    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/ASAI.sol/ASAI.json");
    const contractData = fs.readFileSync(artifactPath, "utf8");
    const { bytecode } = JSON.parse(contractData);

    const contractCreate = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(1000000)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addUint256(1000000000000000)
        );

    const txResponse = await contractCreate.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const contractId = receipt.contractId.toString();
    const txId = txResponse.transactionId.toString();

    const deployment = {
        contractId,
        transactionId: txId,
        operatorId,
        artifactPath,
        gas: 1000000,
        constructor: {
            initialSupply: "1000000000000000",
        },
        timestamp: new Date().toISOString(),
        network: "testnet",
    };

    const deploymentPath = path.resolve(__dirname, "../deployment.json");
    writeJson(deploymentPath, deployment);

    console.log("ASAI deployed:", contractId);
    console.log("Tx:", txId);
    console.log("Saved:", deploymentPath);
    console.log("Next:", "node scripts/deploy-pestreward.js");
}

main().catch(e => {
    console.error("Deployment failed:", e.message);
    process.exit(1);
});