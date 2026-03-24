import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@hashgraph/sdk";
import { submitLog } from "./logger.js";
import { associateToken } from "./services/hts.js";
import { parseHederaPrivateKey } from "./utils/hedera_keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const SERVICE_URL = process.env.HASHGRAPH_URL || `http://localhost:${PORT}`;

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "AgriSense Hashgraph Logger",
        timestamp: new Date().toISOString()
    });
});

app.post("/log", async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ status: "error", message: "Log data required" });
        }

        const result = await submitLog(req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in /log:", error);
        return res.status(500).json({
            status: "error",
            message: error.message || "Failed to submit log",
        });
    }
});

app.post("/associate", async (req, res) => {
    try {
        const { farmerId, farmerKey, tokenId } = req.body;

        if (!farmerId || !farmerKey) {
            return res.status(400).json({ status: "error", message: "farmerId and farmerKey required" });
        }

        const client = Client.forTestnet().setOperator(
            process.env.HEDERA_OPERATOR_ID,
            parseHederaPrivateKey(process.env.HEDERA_OPERATOR_KEY)
        );

        const tokenToAssociate = tokenId || process.env.UTILITY_TOKEN_ID;
        if (!tokenToAssociate) {
            return res.status(400).json({ status: "error", message: "tokenId not provided" });
        }

        const receiptStatus = await associateToken(client, farmerId, farmerKey, tokenToAssociate);

        return res.status(200).json({
            status: "ok",
            farmerId,
            tokenId: tokenToAssociate,
            receiptStatus,
        });
    } catch (error) {
        console.error("Error in /associate:", error);
        return res.status(500).json({
            status: "error",
            message: error.message || "Association failed",
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`AgriSense Hashgraph Logger running on ${SERVICE_URL}`);
});