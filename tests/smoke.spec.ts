import { expect, test } from "@playwright/test";

test("charge Neon Rift et lance une interception", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Neon Rift/);
  await expect(page.getByTestId("intro-overlay")).toBeVisible();
  await expect(page.getByRole("heading", { name: /LE DERNIER PHARE/ })).toBeVisible();
  await page.getByTestId("start-button").click();
  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator("#wave-value")).toHaveText("01 / 05");
  await expect(page.locator("#health-value")).toHaveText("100");
});

test("le dash et la pause répondent au clavier", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.keyboard.down("d");
  await page.keyboard.press("Space");
  await page.keyboard.up("d");
  await page.keyboard.press("p");
  await expect(page.locator("#pause-overlay")).toBeVisible();
  await expect(page.locator("#pause-button")).toHaveText("REPRENDRE");
  await page.keyboard.press("p");
  await expect(page.locator("#pause-overlay")).toBeHidden();
});
