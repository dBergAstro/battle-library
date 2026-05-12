import { test, expect } from "@playwright/test";

test.describe("Source filter MultiSelect", () => {
  test("selecting Записи hides battle cards and shows only replay/group cards", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector(
      '[data-testid^="card-battle-"], [data-testid^="card-group-"], [data-testid^="card-replay-"]',
      { timeout: 15000 }
    );

    const battleCardsBefore = await page.locator('[data-testid^="card-battle-"]').count();
    expect(battleCardsBefore).toBeGreaterThan(0);

    await page.locator('[data-testid="multiselect-source"]').click();

    await page.locator('[data-testid="multiselect-source-option-replays"]').waitFor({
      state: "visible",
      timeout: 5000,
    });
    await page.locator('[data-testid="multiselect-source-option-replays"]').click();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const battleCardsAfter = await page.locator('[data-testid^="card-battle-"]').count();
    expect(battleCardsAfter).toBe(0);

    const replayCards =
      (await page.locator('[data-testid^="card-group-"]').count()) +
      (await page.locator('[data-testid^="card-replay-"]').count());
    expect(replayCards).toBeGreaterThan(0);

    const filterText = await page.locator('[data-testid="multiselect-source"]').textContent();
    expect(filterText).toMatch(/Записи|1 выбрано/);
  });

  test("popover options remain interactive when body pointer-events are suppressed (GAS iframe simulation)", async ({
    page,
  }) => {
    await page.goto("/");

    await page.waitForSelector('[data-testid^="card-battle-"]', { timeout: 15000 });

    await page.locator('[data-testid="multiselect-source"]').click();
    await page.locator('[data-testid="multiselect-source-option-replays"]').waitFor({
      state: "visible",
      timeout: 5000,
    });

    await page.evaluate(() => {
      document.body.style.pointerEvents = "none";
    });

    const option = page.locator('[data-testid="multiselect-source-option-replays"]');
    const computedPE = await option.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(computedPE).toBe("auto");

    await option.click();
    await page.evaluate(() => {
      document.body.style.pointerEvents = "";
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const battleCardsAfter = await page.locator('[data-testid^="card-battle-"]').count();
    expect(battleCardsAfter).toBe(0);

    const replayCards =
      (await page.locator('[data-testid^="card-group-"]').count()) +
      (await page.locator('[data-testid^="card-replay-"]').count());
    expect(replayCards).toBeGreaterThan(0);
  });
});
