import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";

test("home is offline, navigable, and has six categories", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:1420")) external.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Little tasks, done." }),
  ).toBeVisible();
  await expect(page.locator(".category-card")).toHaveCount(6);
  await page.screenshot({
    path: ".cache/screenshots/home.png",
    fullPage: true,
  });
  await page.locator(".category-card").filter({ hasText: "PDF" }).click();
  await expect(
    page.getByRole("button", { name: /PDF to Markdown/ }),
  ).toBeVisible();
  await expect(page.locator(".tool-card")).toHaveCount(8);
  await page.screenshot({
    path: ".cache/screenshots/pdf-tools.png",
    fullPage: true,
  });
  expect(external).toEqual([]);
});

test("password generator produces and changes local passwords", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Passwords" })
    .click();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await expect(page.locator(".generated-password")).toBeVisible();
  const before = await page.locator(".generated-password").textContent();
  expect(before?.split("-")).toHaveLength(6);
  await page.getByRole("button", { name: "Generate another" }).click();
  await expect(page.locator(".generated-password")).not.toHaveText(before!);
});

test("CSV to Excel completes through the actual local worker", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Find a tool" }).fill("CSV to Excel");
  await page.getByRole("button", { name: /CSV to Excel/ }).click();
  // Selecting a search result should open its task immediately.
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "Contacts.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Name,Phone\nAlice,001234\n"),
    });
  await expect(page.getByText("Contacts.csv", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Convert to Excel", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "All done." })).toBeVisible();
  await page.screenshot({
    path: ".cache/screenshots/result.png",
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save file", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Spreadsheet.xlsx");
});

test("speech input is minimal and empty text cannot run", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Audio", exact: true })
    .click();
  await page.getByRole("button", { name: /Text to speech/ }).click();
  await expect(page.getByRole("button", { name: "Read aloud" })).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Text to read aloud" })
    .fill("A little less effort. A little more done.");
  await expect(page.getByRole("button", { name: "Read aloud" })).toBeEnabled();
  await page.screenshot({
    path: ".cache/screenshots/speech.png",
    fullPage: true,
  });
});

test("drawing a redaction removes underlying PDF text", async ({ page }) => {
  const python = process.env.EVERYDAY_PYTHON || path.resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
  const fixture = spawnSync(python, ['-c', "import pymupdf,sys; d=pymupdf.open(); p=d.new_page(width=400,height=500); p.insert_text((40,90),'PRIVATE 123456',fontsize=12); p.insert_text((40,160),'Keep this paragraph.',fontsize=12); sys.stdout.buffer.write(d.tobytes())"]);
  expect(fixture.status).toBe(0);
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'PDF', exact: true }).click();
  await page.getByRole('button', { name: /Redact a PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles({name:'Private.pdf', mimeType:'application/pdf', buffer:fixture.stdout});
  const canvas = page.locator('.redact-canvas'); await expect(canvas).toBeVisible();
  const rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * .08, rect.y + rect.height * .14);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .73, rect.y + rect.height * .22, {steps:5});
  await page.mouse.up();
  await expect(page.locator('.redact-box')).toHaveCount(1);
  await page.screenshot({path:'.cache/screenshots/redaction.png',fullPage:true});
  await page.getByRole('button', { name:'Save redacted PDF',exact:true }).click();
  await expect(page.getByRole('heading', {name:'All done.'})).toBeVisible();
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', {name:'Save file',exact:true}).click();
  const saved = await (await downloadPromise).path();
  const result = spawnSync(python, ['-c', "import pymupdf,sys; d=pymupdf.open(sys.argv[1]); print(d[0].get_text())",saved!], {encoding:'utf-8'});
  expect(result.stdout).not.toContain('PRIVATE'); expect(result.stdout).toContain('Keep this paragraph');
});
