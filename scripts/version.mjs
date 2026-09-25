// package.json is the source of truth; never ship a differently labelled native app.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const save = (file, text) =>
  writeFileSync(new URL(`../${file}`, import.meta.url), text);
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargo = read("src-tauri/Cargo.toml");
const cargoLock = read("src-tauri/Cargo.lock");
const nativePattern = /(name = "everyday"\r?\nversion = ")[^"]+("\r?\n)/;
const version = process.argv[2] === "--check" ? pkg.version : process.argv[2];
assert(/^\d+\.\d+\.\d+$/.test(version || ""), "Use a version such as 0.1.2");
if (process.argv[2] === "--check") {
  assert.equal(lock.version, version);
  assert.equal(lock.packages[""].version, version);
  assert.equal(tauri.version, version);
  assert.equal(cargo.match(/version = "([^"]+)"/)[1], version);
  assert(
    cargoLock.replace(/\r\n/g, "\n").includes(`name = "everyday"\nversion = "${version}"`),
    "Cargo.lock version is out of sync",
  );
  console.log(`Version ${version} is consistent across the app and installer.`);
} else {
  pkg.version =
    lock.version =
    lock.packages[""].version =
    tauri.version =
      version;
  for (const [file, value] of [
    ["package.json", pkg],
    ["package-lock.json", lock],
    ["src-tauri/tauri.conf.json", tauri],
  ])
    save(file, JSON.stringify(value, null, 2) + "\n");
  save(
    "src-tauri/Cargo.toml",
    cargo.replace(/version = "[^"]+"/, `version = "${version}"`),
  );
  assert(
    nativePattern.test(cargoLock),
    "Could not find Everyday in Cargo.lock",
  );
  save(
    "src-tauri/Cargo.lock",
    cargoLock.replace(nativePattern, `$1${version}$2`),
  );
  console.log(`Everyday is now ${version}.`);
}
