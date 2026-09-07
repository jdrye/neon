import { expect, test } from "@playwright/test";

test("le hangar lance la mission choisie sans erreur ni ressource externe", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("./");
  await expect(page).toHaveTitle(/Neon Rift/);
  await expect(
    page.getByRole("heading", { name: "LE DERNIER PHARE." }),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("desktop-hangar.png") });
  await page.locator('[data-ship="aegis"]').click();
  await expect(page.locator('[data-ship="aegis"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("start-button").click();
  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.locator("#wave-value")).toHaveText("01 / 05");
  await expect(page.locator("#health-value")).toHaveText("150 / 150");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("desktop-arena.png") });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("dash, pause, reprise et redémarrage fonctionnent au clavier et au clic", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByTestId("start-button").click();
  await page.keyboard.down("d");
  await page.waitForTimeout(120);
  await page.keyboard.press("Space");
  await page.keyboard.up("d");
  await expect(page.locator("#dash-status")).not.toHaveText("PRÊT");
  await page.keyboard.press("p");
  await expect(page.locator("#pause-dialog")).toBeVisible();
  const dash = await page.locator("#dash-status").textContent();
  await page.waitForTimeout(250);
  await expect(page.locator("#dash-status")).toHaveText(dash!);
  await page.getByRole("button", { name: "REPRENDRE", exact: true }).click();
  await expect(page.locator("#pause-dialog")).not.toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Recommencer la mission" }).click();
  await expect(page.locator("#pause-dialog")).not.toBeVisible();
  await expect(page.locator("#health-value")).toHaveText("100 / 100");
  await expect(page.locator("#dash-status")).toHaveText("PRÊT");
  await expect(page.locator("#score-value")).toHaveText("000000");
});

test("aide, réglages et reprise automatique après fermeture du manuel", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByTestId("start-button").click();
  await page.getByRole("button", { name: "Commandes et réglages" }).click();
  await expect(page.locator("#help-dialog")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-state", "paused");
  await page.getByLabel("Réduire les effets visuels").check();
  await page.keyboard.press("Escape");
  await expect(page.locator("#help-dialog")).not.toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-state", "playing");
  await page.getByRole("button", { name: "Désactiver le son" }).click();
  await expect(
    page.getByRole("button", { name: "Activer le son" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Activer le son" }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
});

test("les anciens records migrent et un stockage bloqué ne bloque jamais le lancement", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("neon-rift-best", "42000"),
  );
  await page.goto("./");
  await expect(page.locator("#best-score")).toHaveText(/42\s?000/);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Blocked storage");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Blocked storage");
    };
  });
  await page.reload();
  await page.getByTestId("start-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-state", "playing");
});

test.describe("mobile tactile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("lancement, joystick, dash et pause restent accessibles en portrait", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.getByTestId("start-button")).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath("mobile-hangar.png") });
    await page.getByTestId("start-button").tap();
    await expect(page.locator("#touch-controls")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("mobile-arena.png") });
    const box = (await page.locator("#joystick").boundingBox())!;
    const rest = await page
      .locator("#joystick-knob")
      .evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await expect(page.locator("#joystick-knob")).not.toHaveCSS(
      "transform",
      rest,
    );
    await page.mouse.up();
    await expect(page.locator("#joystick-knob")).toHaveCSS("transform", rest);
    await page.locator("#mobile-dash").tap();
    await expect(page.locator("#dash-status")).not.toHaveText("PRÊT");
    await page.getByRole("button", { name: "Mettre en pause" }).tap();
    await expect(
      page.getByRole("button", { name: "REPRENDRE", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});
