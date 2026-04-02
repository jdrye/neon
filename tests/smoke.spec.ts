import { expect, test } from "@playwright/test";

test("loads Pocket Patience and starts an expedition", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("intro-overlay")).toBeVisible();
  await expect(
    page.getByTestId("intro-overlay").getByRole("heading", { name: "Pocket Patience" })
  ).toBeVisible();

  await page.getByTestId("overlay-start-button").click();

  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.getByTestId("stock-button")).toBeVisible();
  await expect(page.getByTestId("tableau-grid")).toBeVisible();
  await expect(page.getByTestId("foundation-row")).toBeVisible();
  await expect(page.getByTestId("companion-grid")).toContainText("Dormant");
  await expect(page.getByTestId("objective-copy")).toContainText("three habitats");
});
