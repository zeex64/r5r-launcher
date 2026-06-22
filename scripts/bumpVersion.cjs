const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const type = process.argv[2] || "patch";
const allowedTypes = new Set(["patch", "minor", "major"]);

if (!allowedTypes.has(type)) {
  console.error("Usage: node scripts/bumpVersion.cjs [patch|minor|major]");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const tauriConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");

function run(command) {
  console.log(`> ${command}`);
  execSync(command, {
    cwd: rootDir,
    stdio: "inherit",
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function updateCargoVersion(version) {
  const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  const updated = cargoToml.replace(
    /(\[package\][\s\S]*?^\s*version\s*=\s*")([^"]+)(")/m,
    `$1${version}$3`,
  );

  if (updated === cargoToml) {
    throw new Error("Could not update the package version in src-tauri/Cargo.toml.");
  }

  fs.writeFileSync(cargoTomlPath, updated, "utf8");
}

try {
  run(`npm version ${type} --no-git-tag-version`);

  const packageJson = readJson(packageJsonPath);
  const version = packageJson.version;

  const tauriConfig = readJson(tauriConfigPath);
  tauriConfig.version = version;
  writeJson(tauriConfigPath, tauriConfig);

  updateCargoVersion(version);

  console.log(`\nBumped launcher version to ${version}\n`);

  run("git add package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml");
  run(`git commit -m "chore: release v${version}"`);
  run(`git tag -a v${version} -m "Release v${version}"`);
  run("git push --follow-tags");

  console.log(`\nSuccessfully bumped and pushed version ${version}`);
} catch (error) {
  console.error("\nError during version bump:", error.message);
  process.exit(1);
}
