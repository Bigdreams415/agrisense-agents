const { Client, PrivateKey, ContractCallQuery, ContractFunctionParameters, Hbar } = require("@hashgraph/sdk");
const fs = require("fs");
require("dotenv").config();

async function testContract() {
    console.log("🧪 Testing deployed contract...");
    
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY;
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, PrivateKey.fromString(operatorKey));

    try {
        // Read deployment info
        const deployment = JSON.parse(fs.readFileSync("./deployment.json"));
        const contractId = deployment.contractId;
        
        console.log("Testing contract:", contractId);
        
        // Test calling the name function
        const query = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("name")
            .setMaxQueryPayment(new Hbar(1));
        
        const response = await query.execute(client);
        const name = response.getString(0);
        
        console.log("✅ Contract test successful!");
        console.log("Token name:", name);
        
        // Test calling the symbol function
        const symbolQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("symbol")
            .setMaxQueryPayment(new Hbar(1));
        
        const symbolResponse = await symbolQuery.execute(client);
        const symbol = symbolResponse.getString(0);
        
        console.log("Token symbol:", symbol);
        
        // Test getting total supply
        const supplyQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("totalSupply")
            .setMaxQueryPayment(new Hbar(1));
        
        const supplyResponse = await supplyQuery.execute(client);
        const totalSupply = supplyResponse.getUint256(0);
        
        console.log("Total supply:", totalSupply.toString());
        
    } catch (error) {
        console.error("❌ Contract test failed:", error.message);
    }
}

testContract().catch(console.error);
