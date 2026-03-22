import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@hashgraph/sdk";
import { createTopic } from "../services/hcs.js";
import { parseHederaPrivateKey } from "../utils/hedera_keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const AGENT_TOPICS = {
    CropWatchAgent: process.env.TOPIC_CROPWATCH || process.env.TOPIC_ID,
    AdvisoryAgent: process.env.TOPIC_ADVISORY || process.env.TOPIC_ID,
    InsuranceOracleAgent: process.env.TOPIC_INSURANCE || process.env.TOPIC_ID,
    DataMarketplaceAgent: process.env.TOPIC_MARKETPLACE || process.env.TOPIC_ID,
};

export function getTopicForLog(log) {
    const agent = log?.metadata?.agent;
    if (agent && AGENT_TOPICS[agent]) {
        return AGENT_TOPICS[agent];
    }
    return process.env.TOPIC_ID;
}

export async function createAllAgentTopics() {
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    if (!operatorId) {
        throw new Error("HEDERA_OPERATOR_ID is missing in hashgraph/.env");
    }

    const operatorKey = parseHederaPrivateKey(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(
        operatorId,
        operatorKey
    );

    console.log("Creating dedicated HCS topics for each agent...");

    const topics = {};
    for (const agentName of Object.keys(AGENT_TOPICS)) {
        const topicId = await createTopic(client);
        topics[agentName] = topicId;
        console.log(`${agentName} → Topic: ${topicId}`);
    }

    console.log("\nAdd these to your .env:");
    console.log(`TOPIC_CROPWATCH=${topics.CropWatchAgent}`);
    console.log(`TOPIC_ADVISORY=${topics.AdvisoryAgent}`);
    console.log(`TOPIC_INSURANCE=${topics.InsuranceOracleAgent}`);
    console.log(`TOPIC_MARKETPLACE=${topics.DataMarketplaceAgent}`);

    return topics;
}