const { test, expect } = require("playwright/test");

function parseSeconds(value) {
  // Expected format in the HUD: "12.3s"
  const raw = String(value || "").trim().replace("s", "");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

test("la touche Espace ne relance pas une partie en cours", async ({ page }) => {
  await page.goto("/");

  const actionButton = page.locator("#actionBtn");
  await expect(actionButton).toHaveText("Demarrer");
  await actionButton.click();

  // Pendant une partie en cours, le bouton doit etre desactive.
  await expect(actionButton).toHaveText("Partie en cours");
  await expect(actionButton).toBeDisabled();

  // On attend un peu pour avoir un timer non nul.
  await page.waitForTimeout(1200);
  const beforeText = await page.locator("#timeVal").innerText();
  const before = parseSeconds(beforeText);
  expect(before).toBeGreaterThan(0.8);

  // Regression couverte: Espace ne doit pas cliquer le bouton par focus implicite.
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  const afterText = await page.locator("#timeVal").innerText();
  const after = parseSeconds(afterText);

  // Si la partie se relancait, le timer reviendrait proche de 0.
  expect(after).toBeGreaterThan(before);
  await expect(actionButton).toHaveText("Partie en cours");
  await expect(actionButton).toBeDisabled();
});
