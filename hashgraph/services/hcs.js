import {
    TopicCreateTransaction,
    TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { parseHederaPrivateKey } from "../utils/hedera_keys.js";

export async function createTopic(client) {
    const txResponse = await new TopicCreateTransaction().execute(client);
    const receipt = await txResponse.getReceipt(client);
    const topicId = receipt.topicId.toString();
    console.log("New HCS Topic created:", topicId);
    return topicId;
}

export async function submitInferenceLog(client, topicId, inferenceData, operatorKey) {
    try {
        const message = typeof inferenceData === "string"
            ? inferenceData
            : JSON.stringify(inferenceData);

        const key = typeof operatorKey === "string"
            ? parseHederaPrivateKey(operatorKey, "operatorKey")
            : operatorKey;
        const signature = key.sign(Buffer.from(message));

        const signedPayload = {
            message: inferenceData,
            signature: Buffer.from(signature).toString("hex")
        };

        const txResponse = await new TopicMessageSubmitTransaction({
            topicId,
            message: JSON.stringify(signedPayload)
        }).execute(client);

        let receipt;
        try {
            receipt = await txResponse.getReceipt(client);
        } catch (err) {
            console.warn("Could not fetch receipt (non-fatal):", err.message);
        }

        let record;
        try {
            record = await txResponse.getRecord(client);
        } catch (err) {
            console.warn("Could not fetch record (non-fatal):", err.message);
        }

        const consensusTimestamp = record?.consensusTimestamp
            ? record.consensusTimestamp.toDate().toISOString()
            : null;

        const sequenceNumber = record?.consensusTopicSequenceNumber
            ? record.consensusTopicSequenceNumber.toNumber()
            : null;

        const statusStr = receipt?.status
            ? receipt.status.toString()
            : "UNKNOWN";

        console.log(`Log submitted to topic ${topicId} — status: ${statusStr}`);

        return { consensusTimestamp, status: statusStr, sequenceNumber };

    } catch (err) {
        console.error("Error submitting inference log:", err);
        throw err;
    }
}