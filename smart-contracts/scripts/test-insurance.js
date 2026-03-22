const { Client, PrivateKey, ContractCallQuery, ContractExecuteTransaction, Hbar, AccountCreateTransaction, AccountId, ContractFunctionParameters, TransferTransaction } = require("@hashgraph/sdk");
const fs = require("fs");
require("dotenv").config();

async function testCropInsurance() {
    console.log("🧪 Testing CropInsurance contract...");

    // Initialize Hedera client
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_PRIVATE_KEY);
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    try {
        // Read deployment info
        const deployment = JSON.parse(fs.readFileSync("./insurance-deployment.json"));
        const contractId = deployment.contractId;
        console.log("Testing contract:", contractId);

        // Create a new account for testing (simulating a farmer)
        const farmerKey = PrivateKey.generateED25519();
        const farmerAccount = await new AccountCreateTransaction()
            .setKey(farmerKey)
            .setInitialBalance(new Hbar(10))
            .execute(client);
        const farmerReceipt = await farmerAccount.getReceipt(client);
        const farmerId = farmerReceipt.accountId;
        console.log("Created farmer account:", farmerId.toString());

        // Set the farmer's client for transactions
        const farmerClient = Client.forTestnet().setOperator(farmerId, farmerKey);

        // Test 1: Check contract owner
        const ownerQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("owner")
            .setMaxQueryPayment(new Hbar(1));
        const ownerResponse = await ownerQuery.execute(client);
        const owner = ownerResponse.getAddress(0);
        console.log("✅ Owner address:", owner);
        // Note: toSolidityAddress() is deprecated; consider toEvmAddress() for future compatibility
        console.log("Expected owner:", operatorId.toSolidityAddress());

        // Test 2: Check backend address
        const backendQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("backend")
            .setMaxQueryPayment(new Hbar(1));
        const backendResponse = await backendQuery.execute(client);
        const backend = backendResponse.getAddress(0);
        console.log("✅ Backend address:", backend);
        console.log("Expected backend:", operatorId.toSolidityAddress());

        // Test 3: Set backend to operator if not already set
        if (backend !== operatorId.toSolidityAddress()) {
            console.log("Setting backend to operator address...");
            const setBackendTx = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(200000)
                .setFunction("setBackend", new ContractFunctionParameters()
                    .addAddress(operatorId.toSolidityAddress()))
                .setMaxTransactionFee(new Hbar(2));
            const setBackendResponse = await setBackendTx.execute(client);
            const setBackendReceipt = await setBackendResponse.getReceipt(client);
            console.log("✅ Set backend transaction status:", setBackendReceipt.status.toString());
        }

        // Test 4: Calculate premium for farmer
        const coverageAmount = 1000000; // 1,000,000 tinybars
        const premiumQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("calculatePremium", new ContractFunctionParameters()
                .addAddress(farmerId.toSolidityAddress())
                .addUint256(coverageAmount))
            .setMaxQueryPayment(new Hbar(1));
        const premiumResponse = await premiumQuery.execute(client);
        const premium = premiumResponse.getUint256(0);
        console.log("✅ Calculated premium:", premium.toString(), "tinybars");

        // Test 5: Buy insurance for farmer
        const buyInsuranceTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(200000)
            .setFunction("buyInsurance", new ContractFunctionParameters()
                .addUint256(coverageAmount))
            .setPayableAmount(new Hbar(premium.toNumber() / 100000000)) // Convert tinybars to HBAR
            .setMaxTransactionFee(new Hbar(2));
        const buyInsuranceResponse = await buyInsuranceTx.execute(farmerClient);
        const buyInsuranceReceipt = await buyInsuranceResponse.getReceipt(farmerClient);
        console.log("✅ Buy insurance transaction status:", buyInsuranceReceipt.status.toString());

        // Test 6: Get policy details
        const policyQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getPolicy", new ContractFunctionParameters()
                .addAddress(farmerId.toSolidityAddress()))
            .setMaxQueryPayment(new Hbar(1));
        const policyResponse = await policyQuery.execute(client);
        const [premiumPaid, coverage, startDate, endDate, claimedThisSeason, active] = [
            policyResponse.getUint256(0),
            policyResponse.getUint256(1),
            policyResponse.getUint256(2),
            policyResponse.getUint256(3),
            policyResponse.getBool(4),
            policyResponse.getBool(5)
        ];
        console.log("✅ Policy details:");
        console.log("  Premium paid:", premiumPaid.toString());
        console.log("  Coverage amount:", coverage.toString());
        console.log("  Start date:", new Date(startDate.toNumber() * 1000).toISOString());
        console.log("  End date:", new Date(endDate.toNumber() * 1000).toISOString());
        console.log("  Claimed this season:", claimedThisSeason);
        console.log("  Active:", active);

        // Test 7: Set risk score (admin function)
        const riskScore = 120; // 1.2x multiplier
        const setRiskScoreTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(200000)
            .setFunction("setRiskScore", new ContractFunctionParameters()
                .addAddress(farmerId.toSolidityAddress())
                .addUint256(riskScore))
            .setMaxTransactionFee(new Hbar(2));
        const setRiskScoreResponse = await setRiskScoreTx.execute(client);
        const setRiskScoreReceipt = await setRiskScoreResponse.getReceipt(client);
        console.log("✅ Set risk score transaction status:", setRiskScoreReceipt.status.toString());

        // Test 8: Check risk score
        const riskScoreQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("riskScores", new ContractFunctionParameters()
                .addAddress(farmerId.toSolidityAddress()))
            .setMaxQueryPayment(new Hbar(1));
        const riskScoreResponse = await riskScoreQuery.execute(client);
        const farmerRiskScore = riskScoreResponse.getUint256(0);
        console.log("✅ Farmer risk score:", farmerRiskScore.toString());

        // Test 9: Check contract balance before claim
        const balanceQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getContractBalance")
            .setMaxQueryPayment(new Hbar(1));
        const balanceResponse = await balanceQuery.execute(client);
        const contractBalance = balanceResponse.getUint256(0);
        console.log("✅ Contract balance before claim:", contractBalance.toString(), "tinybars");

        // Fund contract if balance is insufficient (needs at least 1,000,000 tinybars for severe drought payout)
        if (contractBalance.toNumber() < 1000000) {
            console.log("Funding contract with 2 HBAR...");
            const fundTx = new TransferTransaction()
                .addHbarTransfer(operatorId, new Hbar(-2))
                .addHbarTransfer(AccountId.fromString(contractId), new Hbar(2))
                .setMaxTransactionFee(new Hbar(1));
            const fundResponse = await fundTx.execute(client);
            const fundReceipt = await fundResponse.getReceipt(client);
            console.log("✅ Fund contract transaction status:", fundReceipt.status.toString());
        }

        // Test 10: Process insurance claim (backend function)
        const processClaimTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("processInsuranceClaim", new ContractFunctionParameters()
                .addAddress(farmerId.toSolidityAddress())
                .addUint256(15) // NDVI score < 20
                .addString("poor")
                .addString("severe"))
            .setMaxTransactionFee(new Hbar(2));
        const processClaimResponse = await processClaimTx.execute(client);
        const processClaimReceipt = await processClaimResponse.getReceipt(client);
        console.log("✅ Process claim transaction status:", processClaimReceipt.status.toString());

        // Test 11: Check contract balance after claim
        const balanceQueryAfter = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getContractBalance")
            .setMaxQueryPayment(new Hbar(1));
        const balanceResponseAfter = await balanceQueryAfter.execute(client);
        const contractBalanceAfter = balanceResponseAfter.getUint256(0);
        console.log("✅ Contract balance after claim:", contractBalanceAfter.toString(), "tinybars");

        console.log("✅ All tests completed successfully!");

    } catch (error) {
        console.error("❌ Contract test failed:", error.message);
        console.error("Error stack:", error.stack);
    } finally {
        client.close();
    }
}

testCropInsurance().catch(console.error);