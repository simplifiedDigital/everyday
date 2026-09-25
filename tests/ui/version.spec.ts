import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const installed = JSON.parse(readFileSync("package.json", "utf8")).version;
const endpoint =
  "https://api.github.com/repos/simplifiedDigital/everyday/releases/latest";

for (const scenario of [
  { tag: `v${installed}`, message: "You're up to date.", update: false },
  { tag: "v0.1.10", message: "A new version is available.", update: true },
  { tag: "v0.1.1", message: "You're using a newer build.", update: false },
]) {
  test(`version panel compares ${scenario.tag}`, async ({ page }) => {
    let requests = 0;
    await page.route(endpoint, (route) => {
      requests++;
      return route.fulfill({
        json: { tag_name: scenario.tag, draft: false, prerelease: false },
      });
    });
    await page.goto("/");
    const trigger = page.getByRole("button", {
      name: `Everyday v${installed}. Version and updates`,
      exact: true,
    });
    await expect(trigger).toBeVisible();
    expect(requests).toBe(0);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Version & updates" });
    await expect(dialog.getByRole("status")).toHaveText(scenario.message);
    await expect(
      dialog.getByRole("button", { name: "Get update" }),
    ).toHaveCount(scenario.update ? 1 : 0);
    await expect(dialog.locator("dd").first()).toHaveText(`v${installed}`);
    await expect(dialog.locator("dd").last()).toHaveText(scenario.tag);
    if (!scenario.update && scenario.tag === `v${installed}`) {
      await page.screenshot({ path: ".cache/screenshots/version.png" });
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    expect(requests).toBe(1);
  });
}

test("failed checks do not claim the app is current, and can be retried", async ({
  page,
}) => {
  await page.route(endpoint, (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: /Version and updates/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toHaveText(
    "Couldn't check. Try again when you're online.",
  );
  await expect(dialog.locator("dd").last()).toHaveText("Unknown");
  await page.unroute(endpoint);
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { tag_name: `v${installed}` } }),
  );
  await dialog.getByRole("button", { name: "Check again" }).click();
  await expect(dialog.getByRole("status")).toHaveText("You're up to date.");
});

test("a repository with no published releases is explained", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 404, json: {} }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Version and updates/ }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "No releases have been published yet.",
  );
  await expect(page.getByRole("button", { name: "Get update" })).toHaveCount(0);
});

test("invalid release metadata is not treated as an update", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      json: { tag_name: "not-a-version", html_url: "https://example.org" },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Version and updates/ }).click();
  await expect(page.getByRole("dialog").locator("dd").last()).toHaveText(
    "Unknown",
  );
  await expect(page.getByRole("button", { name: "Get update" })).toHaveCount(0);
});
