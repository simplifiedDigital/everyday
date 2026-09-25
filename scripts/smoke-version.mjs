// Validate the native installed version and a real GitHub check under Tauri's CSP.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
if (process.platform !== "win32")
  throw new Error("This test uses Windows WebView2.");
const expected = JSON.parse(readFileSync("package.json", "utf8")).version;
const child = spawn(path.resolve("src-tauri/target/release/everyday.exe"), [], {
  windowsHide: true,
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9224",
    WEBVIEW2_USER_DATA_FOLDER: path.resolve(".cache/version-test-profile"),
  },
});
let browser;
try {
  for (let i = 0; i < 45; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9224");
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  assert(browser, "Desktop WebView did not start");
  const page = browser.contexts()[0].pages()[0];
  await page.getByRole("heading", { name: "Little tasks, done." }).waitFor();
  const native = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("plugin:app|version"),
  );
  assert.equal(native, expected);
  const response = page.waitForResponse(
    "https://api.github.com/repos/simplifiedDigital/everyday/releases/latest",
  );
  await page
    .getByRole("button", {
      name: `Everyday v${expected}. Version and updates`,
      exact: true,
    })
    .click();
  const github = await response;
  assert(
    [200, 404].includes(github.status()),
    `GitHub returned ${github.status()}`,
  );
  const dialog = page.getByRole("dialog");
  await page.waitForFunction(() => {
    const status = document.querySelector(".version-status");
    return status && !status.textContent.includes("Checking");
  });
  assert.equal(
    await dialog.locator("dd").first().textContent(),
    `v${expected}`,
  );
  assert(
    !(await dialog.getByRole("status").textContent()).includes("Couldn't"),
  );
  mkdirSync(".cache/screenshots", { recursive: true });
  await page.screenshot({ path: ".cache/screenshots/desktop-version.png" });
  console.log(
    `Native ${native}; ${await dialog.getByRole("status").textContent()}`,
  );
  console.log("NATIVE VERSION + LIVE GITHUB CHECK PASSED");
} finally {
  if (browser) await browser.close();
  child.kill();
}
