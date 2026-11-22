import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const screenshotDir = "artifacts/m1/screenshots";

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("creates and edits a real local project through Chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("DOCUFORGE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Shape evidence into/i })).toBeVisible();

  await page.getByRole("button", { name: "New Documentary" }).click();
  await expect(page.getByRole("heading", { name: "Begin with one compelling subject." })).toBeVisible();
  const topic = `How Kolkata's Port Shaped an Empire ${Date.now()}`;
  await page.getByPlaceholder("How the East India Company Took Control of India").fill(topic);
  await page.getByRole("button", { name: "Create documentary draft" }).click();

  await expect(page.getByRole("heading", { name: "Project library" })).toBeVisible();
  await expect(page.getByText(topic, { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/project-library.png`, fullPage: true });

  await page.getByRole("button", { name: `Open ${topic}` }).click();
  await page.getByLabel("Display title").fill("Kolkata: The Port That Reshaped Empire");
  await page.getByRole("button", { name: "Save revision" }).click();
  await expect(page.getByText("Kolkata: The Port That Reshaped Empire", { exact: true }).first()).toBeVisible();
});

test("shows measured resources and honest future-feature locks", async ({ page }) => {
  await page.goto("/?view=dashboard");
  await page.getByRole("button", { name: "Resource Monitor" }).click();
  await expect(page.getByRole("heading", { name: "Resource Monitor" })).toBeVisible();
  await expect(page.getByText("Measured values only.")).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/resource-monitor.png`, fullPage: true });

  const research = page.getByRole("button", { name: /Research Studio/ });
  await expect(research).toBeDisabled();
});
