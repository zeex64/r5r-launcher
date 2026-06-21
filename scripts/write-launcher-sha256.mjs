import { createHash } from "node:crypto";
import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cargoTomlPath = path.join(workspaceRoot, "src-tauri", "Cargo.toml");
const releaseDir = path.join(workspaceRoot, "build", "release");

function readCargoPackageName() {
  const cargoToml = readFileSync(cargoTomlPath, "utf8");
  const packageSectionMatch = cargoToml.match(/\[package\][\s\S]*?(?:\n\[|$)/);
  if (!packageSectionMatch) {
    throw new Error("Could not find the [package] section in src-tauri/Cargo.toml.");
  }

  const nameMatch = packageSectionMatch[0].match(/^\s*name\s*=\s*"([^"]+)"/m);
  if (!nameMatch) {
    throw new Error("Could not read the Cargo package name from src-tauri/Cargo.toml.");
  }

  return nameMatch[1];
}

function resolveLauncherExePath() {
  const cargoPackageName = readCargoPackageName();
  const expectedExePath = path.join(releaseDir, `${cargoPackageName}.exe`);
  if (existsSync(expectedExePath)) {
    return expectedExePath;
  }

  const exeFiles = readdirSync(releaseDir)
    .filter((entry) => entry.toLowerCase().endsWith(".exe"))
    .map((entry) => path.join(releaseDir, entry));

  if (exeFiles.length === 1) {
    return exeFiles[0];
  }

  throw new Error(
    `Could not find the built launcher exe. Expected ${expectedExePath}, found ${exeFiles.length} .exe files in ${releaseDir}.`,
  );
}

function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function writeLauncherSha256File() {
  const exePath = resolveLauncherExePath();
  const checksum = await computeSha256(exePath);
  const checksumPath = `${exePath}.sha256.txt`;
  writeFileSync(checksumPath, `${checksum}\n`, "utf8");

  console.log(`Wrote launcher checksum to ${checksumPath}`);
  console.log(checksum);

  return { exePath, checksumPath, checksum };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  writeLauncherSha256File().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
