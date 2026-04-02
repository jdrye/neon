import { expect, test } from "@playwright/test";

test("loads the ambitious intro overlay and starts a run", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("intro-overlay")).toBeVisible();
  await expect(
    page.getByTestId("intro-overlay").getByRole("heading", { name: "Pulse Prism" })
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();

  await page.getByTestId("start-button").click();

  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.getByTestId("objective-title")).toHaveText("Secure the live anchors");
  await expect(page.getByTestId("sector-value")).toHaveText("1 / 3");
  await expect(page.getByTestId("loadout-list")).toContainText("Draft upgrades");
  await expect(page.getByTestId("draft-overlay")).toBeHidden();
});
