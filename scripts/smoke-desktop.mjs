// Windows WebView2 integration test for the actual packaged shell.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
if (process.platform !== "win32")
  throw new Error("This smoke test uses Windows WebView2.");
const executable = process.env.EVERYDAY_EXE || path.resolve("src-tauri/target/release/everyday.exe");
if (!process.env.EVERYDAY_EXE) {
  const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
  assert.equal(hash(path.join(path.dirname(executable), "engine/everyday-engine.exe")), hash("src-tauri/engine/everyday-engine.exe"), "The desktop test folder has a stale worker. Copy the newly bundled engine into target/release/engine first.");
}
const child = spawn(executable, [], {
  windowsHide: true,
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9223",
    WEBVIEW2_USER_DATA_FOLDER: path.resolve(".cache/desktop-test-profile"),
  },
});
let browser;
try {
  for (let i = 0; i < 45; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  assert(browser, "Desktop WebView did not start");
  const page = browser.contexts()[0].pages()[0];
  await page.getByRole("heading", { name: "Little tasks, done." }).waitFor();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Passwords" })
    .click();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await page.locator(".generated-password").waitFor({ timeout: 30000 });
  assert.equal(
    (await page.locator(".generated-password").textContent()).split("-").length,
    6,
  );
  mkdirSync(".cache/screenshots", { recursive: true });
  await page.screenshot({ path: ".cache/screenshots/desktop-password.png" });
  mkdirSync(".cache/desktop-check", { recursive: true });
  const csv = path.resolve(".cache/desktop-check/input.csv");
  writeFileSync(csv, "Name,Number\nAlice,00123\n");
  const result = await page.evaluate(async (file) => {
    return window.__TAURI_INTERNALS__.invoke("run_job", {
      request: { tool: "sheet-excel", files: [file], options: {} },
      jobId: crypto.randomUUID(),
    });
  }, csv);
  assert.equal(result.event, "result", JSON.stringify(result));
  assert(result.files[0].endsWith(".xlsx"));
  await page.getByRole("navigation").getByRole("button", { name: "Audio", exact: true }).click();
  await page.getByRole("button", { name: /Text to speech/ }).click();
  await page.getByRole("textbox", { name: "Text to read aloud" }).fill("Hello from Everyday.\n---\n•\n\u200b\nYour files stay on your computer.");
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  try {
    await page.getByRole("heading", { name: "All done." }).waitFor({ timeout: 120000 });
  } catch (error) {
    console.error(await page.locator("body").innerText());
    throw error;
  }
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 1;
  }, undefined, { timeout: 30000 });
  await page.screenshot({ path: ".cache/screenshots/desktop-speech.png" });
  console.log("DESKTOP TEXT TO SPEECH PASSED");
  console.log("DESKTOP WEBVIEW + NATIVE IPC + PACKAGED WORKER PASSED");
} finally {
  if (browser) await browser.close();
  child.kill();
}
