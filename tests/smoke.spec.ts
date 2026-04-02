import { expect, test } from "@playwright/test";

test("loads the intro overlay and starts a run", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("intro-overlay")).toBeVisible();
  await expect(
    page.getByTestId("intro-overlay").getByRole("heading", { name: "Pulse Prism" })
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();

  await page.getByTestId("start-button").click();

  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.getByTestId("wave-value")).toHaveText("1");
  await expect(page.getByTestId("time-value")).toContainText("1:");
  await expect(page.getByTestId("score-value")).toContainText("0");
});
