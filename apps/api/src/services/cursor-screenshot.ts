import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function resolveWorkerDir(): string {
  const fromEnv = process.env.SCREENSHOT_WORKER_DIR?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    join(process.cwd(), "apps/screenshot-worker"),
    join(process.cwd(), "../screenshot-worker"),
    join(process.cwd(), "screenshot-worker"),
  ];

  const found = candidates.find((dir) => existsSync(join(dir, "package.json")));
  if (!found) {
    throw new Error("Could not locate screenshot-worker directory");
  }
  return found;
}

function resolveOutputPath(workerDir: string): string {
  return (
    process.env.CURSOR_SCREENSHOT_OUTPUT_PATH ??
    join(workerDir, "cursor-report.png")
  );
}

export async function captureCursorScreenshot(): Promise<Buffer> {
  const workerDir = resolveWorkerDir();
  const outputPath = resolveOutputPath(workerDir);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "src/run-capture-cursor.ts"], {
      cwd: workerDir,
      env: {
        ...process.env,
        CURSOR_SCREENSHOT_OUTPUT_PATH: outputPath,
        DASHBOARD_URL: process.env.DASHBOARD_URL ?? "http://localhost:3000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Screenshot worker exited with code ${code}`));
    });
  });

  return readFile(outputPath);
}
