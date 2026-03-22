import { PrivateKey } from "@hashgraph/sdk";

export function parseHederaPrivateKey(rawKey, keyName = "HEDERA_OPERATOR_KEY") {
    if (!rawKey) {
        throw new Error(`${keyName} is missing in hashgraph/.env`);
    }

    const normalizedKey = rawKey.trim();
    return normalizedKey.startsWith("0x")
        ? PrivateKey.fromStringECDSA(normalizedKey.slice(2))
        : PrivateKey.fromString(normalizedKey);
}
