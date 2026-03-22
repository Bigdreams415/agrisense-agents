import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@hashgraph/sdk";
import { createUtilityToken } from "./services/hts.js";
import { parseHederaPrivateKey } from "./utils/hedera_keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function main() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  if (!operatorId) {
    throw new Error("HEDERA_OPERATOR_ID is missing in hashgraph/.env");
  }

  const operatorKey = parseHederaPrivateKey(process.env.HEDERA_OPERATOR_KEY);
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  const desiredSupply = 1_000_000;
  const decimals = 2;

  const { tokenId } = await createUtilityToken(client, desiredSupply, decimals);
  console.log("Save this in your .env as UTILITY_TOKEN_ID=", tokenId);
  process.exit(0);
}

main().catch((err) => {
  if (err?.status?.toString?.() === "INVALID_SIGNATURE" || err?.message?.includes("INVALID_SIGNATURE")) {
    console.error("INVALID_SIGNATURE: HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY do not match on Hedera testnet.");
    console.error("Use the exact private key for that account ID, or update HEDERA_OPERATOR_ID to the account that owns this key.");
  }
  console.error(err);
  process.exit(1);
});
