import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

// Load .env file manually
const envPath = path.resolve(__dirname, "../.env");
console.log("Loading env from:", envPath, "Exists:", fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const index = trimmed.indexOf("=");
      if (index !== -1) {
        const key = trimmed.slice(0, index).trim();
        const val = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        console.log(`Setting env: ${key} = ${val ? "present" : "empty"}`);
        process.env[key] = val;
      }
    }
  }
}
console.log("NOMBA_PARENT_ACCOUNT_ID env:", process.env.NOMBA_PARENT_ACCOUNT_ID);


import { findNombaVirtualAccountByRef } from "@/server/nomba";

test("Nomba virtual account lookup diagnostic", async () => {
  const accountRef = "SHQ-ORG-1-PAYER-1";
  console.log("Starting lookup for:", accountRef);
  try {
    const result = await findNombaVirtualAccountByRef(accountRef);
    console.log("Lookup result:", result);
  } catch (error) {
    console.error("Lookup failed with error:", error);
  }
});
