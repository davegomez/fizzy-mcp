# Changelog

## v0.2.0

[compare changes](https://github.com/davegomez/fizzy-mcp/compare/v0.1.0...v0.2.0)

### Features

- **config:** Add FIZZY_ACCOUNT env var support ([04d5a3c](https://github.com/davegomez/fizzy-mcp/commit/04d5a3c))
- **state:** Add centralized account resolver with fallback chain ([6d673aa](https://github.com/davegomez/fizzy-mcp/commit/6d673aa))
- **tools:** Enhance identity tool with list action and validation ([a1f6c8e](https://github.com/davegomez/fizzy-mcp/commit/a1f6c8e))

### Bug Fixes

- **client:** Return void from card lifecycle methods ([4697624](https://github.com/davegomez/fizzy-mcp/commit/4697624))
- **tools:** Adapt task tool to void lifecycle returns ([266bd06](https://github.com/davegomez/fizzy-mcp/commit/266bd06))
- **tools:** Clear column_id when closing card ([c3e48d1](https://github.com/davegomez/fizzy-mcp/commit/c3e48d1))
- **tools:** Hydrate board columns from separate API calls ([185d080](https://github.com/davegomez/fizzy-mcp/commit/185d080))
- Remove preinstall script that triggers security scanners ([0e67b2b](https://github.com/davegomez/fizzy-mcp/commit/0e67b2b))
- **test:** Update mocks to return API slugs with leading slash ([1a7f8cd](https://github.com/davegomez/fizzy-mcp/commit/1a7f8cd))
- **client:** Follow Location header on 201 Created responses ([5378b52](https://github.com/davegomez/fizzy-mcp/commit/5378b52))
- **mocks:** Align mock data with new card schema ([b634818](https://github.com/davegomez/fizzy-mcp/commit/b634818))
- **client:** Serialize board_ids[] and indexed_by in listCards ([70693d0](https://github.com/davegomez/fizzy-mcp/commit/70693d0))
- **tools:** ⚠️  Update searchTool for indexed_by, remove column_id ([e9208d4](https://github.com/davegomez/fizzy-mcp/commit/e9208d4))
- **tools:** Adapt composite and task tools to card.closed field ([1063461](https://github.com/davegomez/fizzy-mcp/commit/1063461))
- **state:** Set cache on safety check early return ([dbbaa2e](https://github.com/davegomez/fizzy-mcp/commit/dbbaa2e))

### Refactors

- **state:** Expand session to store full account/user context ([46466e8](https://github.com/davegomez/fizzy-mcp/commit/46466e8))
- **tools:** Use shared resolveAccount across all tools ([43bd9aa](https://github.com/davegomez/fizzy-mcp/commit/43bd9aa))
- **tools:** Convert tests from vi.spyOn to MSW mocks ([9fe88f6](https://github.com/davegomez/fizzy-mcp/commit/9fe88f6))
- **schemas:** ⚠️  Change CardStatus to publication state, add closed boolean ([342d630](https://github.com/davegomez/fizzy-mcp/commit/342d630))

### Documentation

- Document void return for lifecycle methods ([0bce6d5](https://github.com/davegomez/fizzy-mcp/commit/0bce6d5))
- **tools:** Document Fizzy column conventions ([e4db726](https://github.com/davegomez/fizzy-mcp/commit/e4db726))
- Document FIZZY_ACCOUNT env var and account resolution ([690e6d4](https://github.com/davegomez/fizzy-mcp/commit/690e6d4))
- Update fizzy_search params for API alignment ([c3e18da](https://github.com/davegomez/fizzy-mcp/commit/c3e18da))

### Chore

- **gitignore:** Ignore local MCP config ([c2ea768](https://github.com/davegomez/fizzy-mcp/commit/c2ea768))

### Tests

- **client:** Update lifecycle tests for void returns ([b0cf260](https://github.com/davegomez/fizzy-mcp/commit/b0cf260))
- **schemas:** Update tests for CardStatus and IndexedBy enums ([c11a4b2](https://github.com/davegomez/fizzy-mcp/commit/c11a4b2))
- **client:** Update listCards tests for new filter params ([d75022e](https://github.com/davegomez/fizzy-mcp/commit/d75022e))

#### ⚠️ Breaking Changes

- **tools:** ⚠️  Update searchTool for indexed_by, remove column_id ([e9208d4](https://github.com/davegomez/fizzy-mcp/commit/e9208d4))
- **schemas:** ⚠️  Change CardStatus to publication state, add closed boolean ([342d630](https://github.com/davegomez/fizzy-mcp/commit/342d630))

### ❤️ Contributors

- David Gomez <code@davidgomez.dev>

## v0.1.0

🚀 Initial release
