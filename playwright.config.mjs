import { defineConfig } from "@playwright/test";

const python = process.platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `${python} -m uvicorn docuforge.main:app --host 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100/api/v1/health",
    timeout: 30_000,
    reuseExistingServer: false,
    env: {
      PYTHONPATH: "backend",
      DOCUFORGE_DATA_ROOT: ".runtime/e2e/internal",
      DOCUFORGE_PROJECTS_ROOT: ".runtime/e2e/external/projects",
      DOCUFORGE_PORT: "3100",
      DOCUFORGE_TEST_MODE: "1",
    },
  },
});
