#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

// Ensure clean working directory
try {
	execSync("git diff --quiet && git diff --cached --quiet");
} catch {
	console.error(
		"Working directory is not clean. Commit or stash changes first.",
	);
	process.exit(1);
}

// Bump version + generate changelog (no commit, no tag)
// Forward CLI args to changelogen (e.g. --major, --minor, --patch)
const args = process.argv.slice(2).join(" ");
run(`pnpm changelogen --bump --no-commit --no-tag ${args}`);

// Read bumped version
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;

// Patch server.json
const serverJsonPath = "server.json";
const serverJson = JSON.parse(readFileSync(serverJsonPath, "utf8"));
if (!serverJson.packages?.[0]) {
	console.error("server.json is missing a packages entry.");
	process.exit(1);
}
serverJson.version = version;
serverJson.packages[0].version = version;
writeFileSync(serverJsonPath, `${JSON.stringify(serverJson, null, "\t")}\n`);

// Commit, tag, push
run("git add package.json server.json CHANGELOG.md");
run(`git commit -m "chore(release): v${version}"`);
run(`git tag v${version}`);
run("git push --follow-tags");

console.log(`\nReleased v${version}`);
