import {
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
} from "@hashgraph/sdk";

export async function createUtilityToken(client, desiredSupply = 1_000_000, decimals = 2) {
    const initialSupplyUnits = Math.round(desiredSupply * Math.pow(10, decimals));

    const tx = await new TokenCreateTransaction()
        .setTokenName("AgriSense AI Token")
        .setTokenSymbol("ASAI")
        .setDecimals(decimals)
        .setInitialSupply(initialSupplyUnits)
        .setTreasuryAccountId(process.env.HEDERA_OPERATOR_ID)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    const tokenId = receipt.tokenId.toString();
    return { tokenId, decimals };
}

export async function mintTokens(client, tokenId, amountFloat, decimals = 2) {
    const units = Math.round(amountFloat * Math.pow(10, decimals));
    const tx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setAmount(units)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    return receipt.status.toString();
}

export async function rewardFarmer(client, farmerAccountId, tokenId, amountFloat = 1, decimals = 2) {
    const units = Math.round(amountFloat * Math.pow(10, decimals));

    const tx = await new TransferTransaction()
        .addTokenTransfer(tokenId, process.env.HEDERA_OPERATOR_ID, -units)
        .addTokenTransfer(tokenId, farmerAccountId, units)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    return receipt.status.toString();
}

export async function associateToken(client, farmerId, farmerPrivateKey, tokenId) {
    const farmerClient = client.setOperator(farmerId, farmerPrivateKey);

    const tx = await new TokenAssociateTransaction()
        .setAccountId(farmerId)
        .setTokenIds([tokenId])
        .execute(farmerClient);

    const receipt = await tx.getReceipt(farmerClient);
    console.log(`Token associated with farmer ${farmerId}:`, receipt.status.toString());
    return receipt.status.toString();
}