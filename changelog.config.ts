export default {
	output: "CHANGELOG.md",
	excludeAuthors: true,
	// Strip date-like scopes (e.g., 08-04, 07-03) - not meaningful to readers
	scopeMap: {
		"\\d{2}-\\d{2}": false,
	},
	types: {
		feat: { title: "Features" },
		fix: { title: "Bug Fixes" },
		perf: { title: "Performance" },
		refactor: { title: "Refactors" },
		docs: { title: "Documentation", semver: "patch" },
		build: { title: "Build", semver: "patch" },
		chore: { title: "Chore", semver: false },
		test: { title: "Tests", semver: false },
		style: { title: "Styles", semver: false },
		ci: { title: "CI", semver: false },
	},
};
