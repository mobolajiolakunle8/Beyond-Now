#!/usr/bin/env node
/**
 * Pre-deploy sanity check for BEYOND NOW.
 *
 * Catches the two failures that produced blank/"not configured"/permission
 * errors in production before a build is ever uploaded:
 *   1. Missing production env → Vite bakes empty strings into the bundle.
 *   2. Missing/invalid rules files → Firestore stays on deny-all.
 *
 * Exit code 1 aborts `npm run deploy`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const problems = [];
const notes = [];

/* ---------- 1. production env ---------- */
const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_APP_ID",
  "VITE_ADMIN_EMAIL",
];

function parseEnv(file) {
  if (!existsSync(file)) return null;
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const prod = parseEnv(resolve(root, ".env.production"));
const base = parseEnv(resolve(root, ".env")) ?? {};
if (!prod) {
  problems.push(".env.production is missing. Vite will bake empty Firebase config into the production bundle.");
} else {
  const merged = { ...base, ...prod, ...process.env };
  for (const key of REQUIRED) {
    const v = merged[key];
    if (!v || /^your-|^changeme$/i.test(v)) problems.push(`${key} is empty or still a placeholder in .env.production.`);
  }
  if (merged.VITE_FIREBASE_PROJECT_ID) notes.push(`project: ${merged.VITE_FIREBASE_PROJECT_ID}`);
  if (merged.VITE_ADMIN_EMAIL) notes.push(`root admin: ${merged.VITE_ADMIN_EMAIL}`);
}

/* ---------- 2. rules files ---------- */
for (const f of ["firestore.rules", "storage.rules"]) {
  const path = resolve(root, f);
  if (!existsSync(path)) {
    problems.push(`${f} is missing — Firestore/Storage would stay on deny-all.`);
    continue;
  }
  const text = readFileSync(path, "utf8");
  if (!/rules_version\s*=\s*'2'/.test(text)) problems.push(`${f} must start with rules_version = '2'.`);
  if (f === "firestore.rules" && !/match \/threads\/\{threadId\}/.test(text)) {
    problems.push("firestore.rules does not define /threads — member chat would be denied.");
  }
}

/* ---------- 3. firebase.json wiring ---------- */
try {
  const fj = JSON.parse(readFileSync(resolve(root, "firebase.json"), "utf8"));
  if (fj.firestore?.rules !== "firestore.rules") problems.push('firebase.json → firestore.rules is not "firestore.rules".');
  if (fj.storage?.rules !== "storage.rules") problems.push('firebase.json → storage.rules is not "storage.rules".');
  if (fj.hosting?.public !== "dist") problems.push('firebase.json → hosting.public should be "dist".');
} catch {
  problems.push("firebase.json is missing or invalid JSON.");
}

/* ---------- report ---------- */
const line = (s) => console.log(s);
line("");
line("BEYOND NOW · preflight");
for (const n of notes) line(`  · ${n}`);
if (problems.length) {
  line("");
  for (const p of problems) line(`  ✖ ${p}`);
  line("");
  line("Deployment aborted. Fix the items above, then run `npm run deploy` again.");
  process.exit(1);
}
line("  ✔ production env present and complete");
line("  ✔ firestore.rules / storage.rules valid and wired");
line("");
process.exit(0);
