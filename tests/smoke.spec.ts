import { expect, test } from "@playwright/test";

test("charge Neon Relay et lance une partie", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Neon Relay/);
  await expect(page.getByTestId("intro-overlay")).toBeVisible();
  await expect(page.getByRole("heading", { name: "NEON RELAY" })).toBeVisible();
  await page.getByTestId("start-button").click();
  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator("#score")).toHaveText("000000");
  await expect(page.locator("#lives")).toContainText("◆ ◆ ◆");
});

test("les commandes clavier déplacent et mettent en pause", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("p");
  await expect(page.locator("#pause-card")).toBeVisible();
  await expect(page.locator("#pause-button")).toHaveText("REPRENDRE");
});
