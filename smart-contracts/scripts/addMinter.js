// scripts/addMinterWithHederaAccount.js
const { Client, PrivateKey, ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");
require("dotenv").config();

async function main() {
    console.log("🔧 Adding PestReward as minter using Hedera SDK...");

    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY;
    
    if (!operatorId || !operatorKey) {
        throw new Error("Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_PRIVATE_KEY in .env file");
    }

    const client = Client.forTestnet();
    const privateKey = PrivateKey.fromString(operatorKey);
    client.setOperator(operatorId, privateKey);

    const ASAI_CONTRACT_ID = "0.0.6915579"; // Your ASAI contract
    const PEST_REWARD_CONTRACT_ID = "0.0.6915678"; // PestReward contract

    console.log("Using operator account:", operatorId);
    console.log("ASAI Contract:", ASAI_CONTRACT_ID);
    console.log("PestReward Contract:", PEST_REWARD_CONTRACT_ID);

    try {
        // Convert PestReward contract ID to EVM address for the function call
        const pestRewardEvmAddress = "0x000000000000000000000000000000000069865e";

        // Call addMinter function on ASAI contract
        const contractExecTx = new ContractExecuteTransaction()
            .setContractId(ASAI_CONTRACT_ID)
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

    } catch (error) {
        console.error("❌ Transaction failed:", error.message);
    }
}

main().catch(console.error);