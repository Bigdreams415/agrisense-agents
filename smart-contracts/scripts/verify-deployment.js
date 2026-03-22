const { Client, PrivateKey, ContractCallQuery, ContractFunctionParameters, Hbar, ContractId } = require("@hashgraph/sdk");
const fs = require("fs");
require("dotenv").config();

function hederaToEvmAddress(contractId) {
    const contractIdObj = ContractId.fromString(contractId);
    return '0x' + contractIdObj.toSolidityAddress();
}

async function main() {
    console.log("🔍 Verifying deployment...");
    
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY;
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, PrivateKey.fromString(operatorKey));

    try {
        // Load deployment info
        const asaiDeployment = JSON.parse(fs.readFileSync("./deployment.json"));
        const pestRewardDeployment = JSON.parse(fs.readFileSync("./pest-reward-deployment.json"));
        
        console.log("📋 ASAI Contract:", asaiDeployment.contractId);
        console.log("📋 PestReward Contract:", pestRewardDeployment.contractId);
        console.log("📋 Backend Address:", pestRewardDeployment.backendAddress);
        
        // Test ASAI token
        console.log("\n🧪 Testing ASAI Token...");
        const asaiQuery = new ContractCallQuery()
            .setContractId(asaiDeployment.contractId)
            .setGas(100000)
            .setFunction("name")
            .setMaxQueryPayment(new Hbar(1));
        
        const asaiResponse = await asaiQuery.execute(client);
        console.log("✅ ASAI Name:", asaiResponse.getString(0));
        
        // Test PestReward contract
        console.log("\n🧪 Testing PestReward Contract...");
        const pestRewardQuery = new ContractCallQuery()
            .setContractId(pestRewardDeployment.contractId)
            .setGas(100000)
            .setFunction("getContractInfo")
            .setMaxQueryPayment(new Hbar(1));
        
        const pestResponse = await pestRewardQuery.execute(client);
        console.log("✅ PestReward ASAI Address:", pestResponse.getString(0));
        console.log("✅ PestReward Owner:", pestResponse.getString(1));
        console.log("✅ PestReward Backend:", pestResponse.getString(2));
        
        console.log("\n🎉 ALL CONTRACTS DEPLOYED AND WORKING!");
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    }
}

main().catch(console.error);
