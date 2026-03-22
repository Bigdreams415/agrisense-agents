import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import pkg from "@pinata/sdk";
const pinataSDK = pkg.default || pkg;

const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

console.log("Pinata JWT loaded:", process.env.PINATA_JWT ? "yes" : "no");

export async function uploadToIPFS(content) {
    try {
        const options = {
            pinataMetadata: { name: "AgriSense AI NFT" },
            pinataOptions: { cidVersion: 1 },
        };

        const result = await pinata.pinJSONToIPFS(content, options);
        console.log(`Uploaded to Pinata — CID: ${result.IpfsHash}`);
        return result.IpfsHash;
    } catch (err) {
        console.error("Failed to upload to Pinata:", err.message);
        throw err;
    }
}