/**
 * Push SAFEPAY_* from local .env to Vercel Production (sandbox trial).
 * Usage: node scripts/sync-safepay-sandbox-from-env.mjs
 * Requires: npx vercel login (once)
 */
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const envPath = existsSync(resolve(root, ".env.local"))
  ? resolve(root, ".env.local")
  : resolve(root, ".env");

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = parseEnv(envPath);
const keys = ["SAFEPAY_ENV", "SAFEPAY_API_KEY", "SAFEPAY_SECRET_KEY", "SAFEPAY_INTENT"];
for (const k of keys) {
  if (!env[k]?.trim()) {
    console.error(`Missing ${k} in ${envPath}`);
    process.exit(1);
  }
}

if (env.SAFEPAY_ENV.trim().toLowerCase() !== "sandbox") {
  console.error(`Refusing: SAFEPAY_ENV is "${env.SAFEPAY_ENV}" (expected sandbox).`);
  process.exit(1);
}

function vercel(args, input) {
  const r = spawnSync("npx", ["vercel", ...args], {
    cwd: root,
    input,
    encoding: "utf8",
    shell: true,
    stdio: input != null ? ["pipe", "pipe", "pipe"] : "inherit",
  });
  if (input != null) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  return r.status ?? 1;
}

console.log(`Reading ${envPath}`);
console.log(
  `API key: ${env.SAFEPAY_API_KEY.slice(0, 8)}… · secret length ${env.SAFEPAY_SECRET_KEY.length}`,
);

for (const k of keys) {
  console.log(`\n→ ${k} (Production)`);
  // Remove existing (ignore failure if missing)
  spawnSync("npx", ["vercel", "env", "rm", k, "production", "-y"], {
    cwd: root,
    shell: true,
    stdio: "pipe",
  });
  const code = vercel(["env", "add", k, "production"], `${env[k]}\n`);
  if (code !== 0) {
    console.error(`Failed to set ${k}. Run: npx vercel login`);
    process.exit(code);
  }
}

console.log("\nDone. Redeploy Production, then Test Safepay connection.");
console.log("Optional: npx vercel --prod");
