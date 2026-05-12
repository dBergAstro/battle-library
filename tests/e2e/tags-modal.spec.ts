import { test, expect } from "@playwright/test";

test.describe("TagsModal dialog", () => {
  test("clicking the Tag button on a battle card opens the TagsModal dialog", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector('[data-testid^="card-battle-"]', { timeout: 15000 });

    const firstCard = page.locator('[data-testid^="card-battle-"]').first();
    await firstCard.hover();

    const tagButton = firstCard.locator('[data-testid^="button-tags-"]');
    await tagButton.waitFor({ state: "visible", timeout: 5000 });
    await tagButton.click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    await expect(dialog.locator('[data-testid="input-new-tag"]')).toBeVisible();
    await expect(dialog.locator('[data-testid="button-add-tag"]')).toBeVisible();

    const dialogText = await dialog.textContent();
    expect(dialogText).toMatch(/Теги для боя/);

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  });

  test("TagsModal dialog content is interactive when body pointer-events are suppressed (GAS iframe simulation)", async ({
    page,
  }) => {
    await page.goto("/");

    await page.waitForSelector('[data-testid^="card-battle-"]', { timeout: 15000 });

    const firstCard = page.locator('[data-testid^="card-battle-"]').first();
    await firstCard.hover();

    const tagButton = firstCard.locator('[data-testid^="button-tags-"]');
    await tagButton.waitFor({ state: "visible", timeout: 5000 });
    await tagButton.click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    await page.evaluate(() => {
      document.body.style.pointerEvents = "none";
    });

    const input = dialog.locator('[data-testid="input-new-tag"]');
    await expect(input).toBeVisible();

    await input.click();
    await page.keyboard.type("test-tag");
    const inputValue = await input.inputValue();
    expect(inputValue).toBe("test-tag");

    const addButton = dialog.locator('[data-testid="button-add-tag"]');
    const addButtonPE = await addButton.evaluate(
      (el) => window.getComputedStyle(el).pointerEvents
    );
    expect(addButtonPE).toBe("auto");

    await page.evaluate(() => {
      document.body.style.pointerEvents = "";
    });

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  });
});
