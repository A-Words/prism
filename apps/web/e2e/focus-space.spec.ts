import { test, expect } from "@playwright/test";

test("focus space shell renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Prism Focus Space")).toBeVisible();
  await expect(page.getByText("万物探索栏")).toBeVisible();
});
