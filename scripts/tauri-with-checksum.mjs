import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeLauncherSha256File } from "./write-launcher-sha256.mjs";

const tauriArgs = process.argv.slice(2);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tauriBinary = path.join(
  workspaceRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri",
);
const result =
  process.platform === "win32"
    ? spawnSync("cmd.exe", ["/c", tauriBinary, ...tauriArgs], { stdio: "inherit" })
    : spawnSync(tauriBinary, tauriArgs, { stdio: "inherit" });

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error instanceof Error ? result.error.message : String(result.error));
  process.exit(1);
}

if (tauriArgs[0] === "build") {
  try {
    await writeLauncherSha256File();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
