import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewedPackages = {
  zod: {
    version: "3.25.76+mairie360.1", upstreamVersion: "3.25.76", advisory: "GHSA-mrhx-c7xc-m3w5",
    upstreamIntegrity: "sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==",
    v3Reference: "https://github.com/dokson/zod/commit/9f5b6c52",
    v4Reference: "https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd"
  }
};

const reviewedZodAdvisory = {
  id: 1243066,
  url: "https://github.com/advisories/GHSA-mrhx-c7xc-m3w5",
  title: "Zod can exhaust memory while validating oversized constrained collections",
  severity: "high",
  vulnerable_versions: "<4.6.6",
  cwe: ["CWE-770"],
  cvss: { score: 7.5, vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H" }
};

export function verifySecurityBackports(root = projectRoot, { installed = false } = {}) {
  const json = file => JSON.parse(readFileSync(resolve(root, file), "utf8"));
  const manifest = json("vendor/security-patches.json");
  const packageJson = json("package.json");
  const lock = json("package-lock.json");
  assert.equal(manifest.version, 1);
  assert.deepEqual(Object.keys(manifest.packages).sort(), Object.keys(reviewedPackages).sort());

  for (const [name, reviewed] of Object.entries(reviewedPackages)) {
    const directory = resolve(root, "vendor", name);
    const patch = manifest.packages[name];
    for (const [key, value] of Object.entries(reviewed)) assert.equal(patch[key], value, `${name}: unreviewed ${key}`);
    const expectedFiles = Object.keys(patch.files).sort();
    const actualFiles = readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile()).map(entry => resolve(entry.parentPath, entry.name).slice(directory.length + 1).replaceAll("\\", "/")).sort();
    assert.deepEqual(actualFiles, expectedFiles, `${name}: reviewed file list changed`);
    assert.ok(expectedFiles.includes("LICENSE"), `${name}: upstream license is missing`);
    for (const file of expectedFiles) {
      assert.ok(!file.split("/").includes("..") && !file.startsWith("/"), "Invalid backport path");
      const digest = createHash("sha256").update(readFileSync(resolve(directory, file))).digest("hex");
      assert.equal(digest, patch.files[file], `${name}/${file}: reviewed backport changed`);
    }
    const vendored = json(`vendor/${name}/package.json`);
    assert.equal(vendored.name, name);
    assert.equal(vendored.version, reviewed.version);
    assert.equal(vendored.private, true);
    assert.equal(packageJson.devDependencies[name], `file:vendor/${name}`);
    assert.equal(packageJson.overrides[name], `$${name}`);
    assert.equal(lock.packages[""].devDependencies[name], `file:vendor/${name}`);
    assert.equal(lock.packages[`vendor/${name}`].version, reviewed.version);
    const entries = Object.entries(lock.packages).filter(([path]) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`));
    assert.ok(entries.length > 0, `${name}: locked dependency missing`);
    for (const [path, value] of entries) {
      assert.equal(value.link, true, `${path}: registry implementation must not be installed`);
      assert.equal(value.resolved, `vendor/${name}`, `${path}: backport resolution changed`);
    }
    if (installed) {
      const require = createRequire(resolve(root, "package.json"));
      assert.equal(realpathSync(require.resolve(`${name}/package.json`)), resolve(directory, "package.json"), `${name}: installed package is not the reviewed backport`);
      for (const [path, consumer] of Object.entries(lock.packages)) {
        if (!path.startsWith("node_modules/") || (!consumer.dependencies?.[name] && !consumer.peerDependencies?.[name])) continue;
        const packageFile = resolve(root, path, "package.json");
        if (!existsSync(packageFile) && (consumer.dev || consumer.optional || consumer.devOptional)) continue;
        const consumerRequire = createRequire(realpathSync(packageFile));
        assert.equal(realpathSync(consumerRequire.resolve(`${name}/package.json`)), resolve(directory, "package.json"), `${path}: installed consumer bypasses the reviewed backport`);
      }
    }
  }
  return Object.keys(reviewedPackages);
}

export async function auditSecurityBackports(root = projectRoot, request = fetch) {
  verifySecurityBackports(root);
  const versions = Object.fromEntries(Object.entries(reviewedPackages).map(([name, patch]) => [name, [patch.upstreamVersion]]));
  const response = await request("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(versions), signal: AbortSignal.timeout(15_000)
  });
  assert.ok(response.ok, `Upstream dependency advisory check failed: HTTP ${response.status}`);
  const advisories = await response.json();
  assert.ok(advisories && typeof advisories === "object" && !Array.isArray(advisories), "Invalid upstream advisory response");
  for (const [name, entries] of Object.entries(advisories)) {
    assert.ok(Object.hasOwn(reviewedPackages, name) && Array.isArray(entries), "Unexpected upstream advisory response");
    for (const advisory of entries) {
      assert.deepEqual(advisory, reviewedZodAdvisory, `${name}: additional or revised advisory requires review`);
    }
  }
  return Object.keys(versions);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log("Verified local security backports:", verifySecurityBackports(undefined, { installed: process.argv.includes("--installed") }).join(", "));
  if (process.argv.includes("--audit-upstream")) console.log("Checked current upstream advisories:", (await auditSecurityBackports()).join(", "));
}
