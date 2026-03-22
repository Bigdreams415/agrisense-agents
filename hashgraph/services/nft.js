import {
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    Hbar,
    TokenMintTransaction,
    TokenId
} from "@hashgraph/sdk";
import { parseHederaPrivateKey } from "../utils/hedera_keys.js";

export async function createNFTCollection(client) {
    try {
        const tx = await new TokenCreateTransaction()
            .setTokenName(process.env.NFT_NAME || "AgriSense AI NFT")
            .setTokenSymbol(process.env.NFT_SYMBOL || "ASAI_NFT")
            .setTokenType(TokenType.NonFungibleUnique)
            .setDecimals(0)
            .setInitialSupply(0)
            .setTreasuryAccountId(process.env.HEDERA_OPERATOR_ID)
            .setAdminKey(client.operatorPublicKey)
            .setSupplyKey(client.operatorPublicKey)
            .setFreezeDefault(false)
            .setSupplyType(TokenSupplyType.Infinite)
            .setMaxTransactionFee(new Hbar(20))
            .execute(client);

        const receipt = await tx.getReceipt(client);
        const tokenId = receipt.tokenId;
        console.log(`NFT Collection created — ID: ${tokenId.toString()}`);
        return tokenId.toString();
    } catch (err) {
        console.error("Failed to create NFT collection:", err);
        throw err;
    }
}

export async function mintPredictionNFT(client, log, ipfsCid) {
    try {
        if (!process.env.NFT_COLLECTION_ID) {
            throw new Error("NFT_COLLECTION_ID missing in .env");
        }

        const tokenId = TokenId.fromString(process.env.NFT_COLLECTION_ID);
        const metadataBytes = Buffer.from(ipfsCid);

        const tx = await new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata([metadataBytes])
            .freezeWith(client);

        const signTx = await tx.sign(
            parseHederaPrivateKey(process.env.HEDERA_OPERATOR_KEY)
        );
        const submitTx = await signTx.execute(client);
        const receipt = await submitTx.getReceipt(client);

        console.log(
            `Minted NFT in collection ${tokenId.toString()} — serial: ${receipt.serials[0].toString()}`
        );

        return {
            tokenId: tokenId.toString(),
            serial: receipt.serials[0].toString(),
            ipfsCid,
        };
    } catch (err) {
        console.error("Failed to mint NFT:", err);
        throw err;
    }
}