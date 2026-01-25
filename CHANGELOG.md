# Changelog

## v2.0.0

[compare changes](https://github.com/davegomez/fizzy-mcp/compare/v1.1.0...v2.0.0)

### Features

- **config:** Add centralized env var constants and token reader ([df12314](https://github.com/davegomez/fizzy-mcp/commit/df12314))
- **client:** ⚠️  Rename FIZZY_ACCESS_TOKEN to FIZZY_TOKEN ([c365fc5](https://github.com/davegomez/fizzy-mcp/commit/c365fc5))

### Documentation

- Update documentation for FIZZY_TOKEN rename ([cdf0cb1](https://github.com/davegomez/fizzy-mcp/commit/cdf0cb1))
- Add diataxis documentation guidance ([71ac454](https://github.com/davegomez/fizzy-mcp/commit/71ac454))

### Tests

- **client:** Update tests for FIZZY_TOKEN rename ([2ed5fbf](https://github.com/davegomez/fizzy-mcp/commit/2ed5fbf))
- **tools:** Update tests for FIZZY_TOKEN rename ([44b1e28](https://github.com/davegomez/fizzy-mcp/commit/44b1e28))

#### ⚠️ Breaking Changes

- **client:** ⚠️  Rename FIZZY_ACCESS_TOKEN to FIZZY_TOKEN ([c365fc5](https://github.com/davegomez/fizzy-mcp/commit/c365fc5))

### ❤️ Contributors

- David Gomez <code@davidgomez.dev>

## v1.1.0


### Features

- **01-01:** Add Result type for error handling ([f85ce27](https://github.com/davegomez/fizzy-mcp/commit/f85ce27))
- **01-01:** Add error class hierarchy ([e615ec7](https://github.com/davegomez/fizzy-mcp/commit/e615ec7))
- **01-01:** Add pagination helper with async generator ([44ecfd1](https://github.com/davegomez/fizzy-mcp/commit/44ecfd1))
- **01-01:** Add FizzyClient with Result-based error handling ([5453adb](https://github.com/davegomez/fizzy-mcp/commit/5453adb))
- **01-02:** Add session state management ([5887dd4](https://github.com/davegomez/fizzy-mcp/commit/5887dd4))
- **01-02:** Add identity schemas with Zod validation ([91166be](https://github.com/davegomez/fizzy-mcp/commit/91166be))
- **01-02:** Add identity tools with Result type handling ([fb13c68](https://github.com/davegomez/fizzy-mcp/commit/fb13c68))
- **01-03:** Add server module with createServer function ([b11d790](https://github.com/davegomez/fizzy-mcp/commit/b11d790))
- **01-03:** Add stdio server entrypoint ([629307b](https://github.com/davegomez/fizzy-mcp/commit/629307b))
- **01-03:** Add bin configuration for npm package ([86117f5](https://github.com/davegomez/fizzy-mcp/commit/86117f5))
- **02-01:** Add markdown conversion utilities ([68fd9ee](https://github.com/davegomez/fizzy-mcp/commit/68fd9ee))
- **02-01:** Add board schemas with Zod validation ([2db67eb](https://github.com/davegomez/fizzy-mcp/commit/2db67eb))
- **02-01:** Add listBoards and getBoard client methods ([53a509f](https://github.com/davegomez/fizzy-mcp/commit/53a509f))
- **02-03:** Add column schemas ([def46eb](https://github.com/davegomez/fizzy-mcp/commit/def46eb))
- **02-04:** Add tag schema and listTags client method ([b5f3fee](https://github.com/davegomez/fizzy-mcp/commit/b5f3fee))
- **02-03:** Add column client methods ([6790e98](https://github.com/davegomez/fizzy-mcp/commit/6790e98))
- **02-04:** Add fizzy_list_tags tool ([ca6bfa9](https://github.com/davegomez/fizzy-mcp/commit/ca6bfa9))
- **02-03:** Add column tools and register with server ([629421e](https://github.com/davegomez/fizzy-mcp/commit/629421e))
- **02-02:** Add board tools for list, get, create, update ([5db83ce](https://github.com/davegomez/fizzy-mcp/commit/5db83ce))
- **02-05:** Add card schemas with Zod validation ([a91be9a](https://github.com/davegomez/fizzy-mcp/commit/a91be9a))
- **02-05:** Add listCards and getCard client methods ([6ce0457](https://github.com/davegomez/fizzy-mcp/commit/6ce0457))
- **02-05:** Add createCard, updateCard, deleteCard client methods ([0b8e4b0](https://github.com/davegomez/fizzy-mcp/commit/0b8e4b0))
- **02-07:** Add closeCard and reopenCard client methods ([85227cb](https://github.com/davegomez/fizzy-mcp/commit/85227cb))
- **02-06:** Add list and get card tools ([f775341](https://github.com/davegomez/fizzy-mcp/commit/f775341))
- **02-06:** Add create, update, delete card tools ([5e526c4](https://github.com/davegomez/fizzy-mcp/commit/5e526c4))
- **02-08:** Add toggle client methods for tags and assignees ([760bb82](https://github.com/davegomez/fizzy-mcp/commit/760bb82))
- **02-06:** Register card CRUD tools with server ([9ad629b](https://github.com/davegomez/fizzy-mcp/commit/9ad629b))
- **02-08:** Add toggle tool tests ([444b8f5](https://github.com/davegomez/fizzy-mcp/commit/444b8f5))
- **03-01:** Add Comment Zod schemas ([be58d38](https://github.com/davegomez/fizzy-mcp/commit/be58d38))
- **03-02:** Implement updateComment and deleteComment client methods ([b2ec328](https://github.com/davegomez/fizzy-mcp/commit/b2ec328))
- **03-01:** Add step client methods and mock handlers ([2b6d35b](https://github.com/davegomez/fizzy-mcp/commit/2b6d35b))
- **03-03:** Export Step and Comment schemas from index ([2cb3e18](https://github.com/davegomez/fizzy-mcp/commit/2cb3e18))
- **03-06:** Add direct upload utilities ([65ef0a3](https://github.com/davegomez/fizzy-mcp/commit/65ef0a3))
- **03-05:** Add step CRUD tools ([ded0628](https://github.com/davegomez/fizzy-mcp/commit/ded0628))
- **03-04:** Add comment CRUD tools ([f743c37](https://github.com/davegomez/fizzy-mcp/commit/f743c37))
- **03-05:** Register step tools with server ([0226f48](https://github.com/davegomez/fizzy-mcp/commit/0226f48))
- **03-06:** Add createDirectUpload method to FizzyClient ([adfe1ff](https://github.com/davegomez/fizzy-mcp/commit/adfe1ff))
- **03-08:** Add bulk close cards tool ([71790b8](https://github.com/davegomez/fizzy-mcp/commit/71790b8))
- **03-08:** Register composite tools with server ([0ae78cc](https://github.com/davegomez/fizzy-mcp/commit/0ae78cc))
- **03-09:** Add attachFileTool for file uploads ([981feb9](https://github.com/davegomez/fizzy-mcp/commit/981feb9))
- **03-09:** Register attachFileTool with server ([010fc0f](https://github.com/davegomez/fizzy-mcp/commit/010fc0f))
- **05-01:** Add inline Levenshtein helper for action suggestions ([6de430c](https://github.com/davegomez/fizzy-mcp/commit/6de430c))
- **05-02:** Add fizzy_toggle_card_attribute tool ([898eb42](https://github.com/davegomez/fizzy-mcp/commit/898eb42))
- **05-03:** Consolidate get/set default account into single tool ([601690f](https://github.com/davegomez/fizzy-mcp/commit/601690f))
- **06-01:** Add ErrorContext interface and RESOURCE_LIST_TOOLS ([eda443e](https://github.com/davegomez/fizzy-mcp/commit/eda443e))
- **06-01:** Implement formatInstructiveMessage for structured errors ([6818781](https://github.com/davegomez/fizzy-mcp/commit/6818781))
- **06-02:** Add error context to card tools ([4be4ee6](https://github.com/davegomez/fizzy-mcp/commit/4be4ee6))
- **06-02:** Add error context to card state tool ([44b84b3](https://github.com/davegomez/fizzy-mcp/commit/44b84b3))
- **06-02:** Add error context to card attribute tool ([8072bed](https://github.com/davegomez/fizzy-mcp/commit/8072bed))
- **06-03:** Add error context to board and column tools ([8f7d8a9](https://github.com/davegomez/fizzy-mcp/commit/8f7d8a9))
- **06-03:** Add error context to comment, step, and tag tools ([bb0ab9f](https://github.com/davegomez/fizzy-mcp/commit/bb0ab9f))
- **06-03:** Add error context to identity and composite tools ([fe124cb](https://github.com/davegomez/fizzy-mcp/commit/fe124cb))
- **07-01:** Add pagination schema with metadata types ([dd06891](https://github.com/davegomez/fizzy-mcp/commit/dd06891))
- **07-01:** Add cursor encode/decode helpers ([060670a](https://github.com/davegomez/fizzy-mcp/commit/060670a))
- **07-01:** Export pagination schema from index ([9e9fe03](https://github.com/davegomez/fizzy-mcp/commit/9e9fe03))
- **07-02:** Add pagination support to client list methods ([5e857f8](https://github.com/davegomez/fizzy-mcp/commit/5e857f8))
- **07-03:** Add pagination params to board and tag list tools ([5a57fd1](https://github.com/davegomez/fizzy-mcp/commit/5a57fd1))
- **07-03:** Add pagination params to card and column list tools ([42b5c5f](https://github.com/davegomez/fizzy-mcp/commit/42b5c5f))
- **07-03:** Add pagination params to comment list tool ([72042b4](https://github.com/davegomez/fizzy-mcp/commit/72042b4))
- **08-02:** Add length constraints to board description params ([d8a5820](https://github.com/davegomez/fizzy-mcp/commit/d8a5820))
- **08-01:** Add explicit default to position parameter ([6c148a5](https://github.com/davegomez/fizzy-mcp/commit/6c148a5))
- **08-02:** Add length constraint to column update name param ([5cbda71](https://github.com/davegomez/fizzy-mcp/commit/5cbda71))
- **08-02:** Add length constraints to steps and comments params ([8ec67c2](https://github.com/davegomez/fizzy-mcp/commit/8ec67c2))
- **08-03:** Add length constraints to composite tool params ([334e984](https://github.com/davegomez/fizzy-mcp/commit/334e984))
- **08-03:** Improve upload content_type documentation ([8dd49ca](https://github.com/davegomez/fizzy-mcp/commit/8dd49ca))
- **client:** Add getCardById method ([9f945c0](https://github.com/davegomez/fizzy-mcp/commit/9f945c0))
- **tools:** Add card_id parameter to fizzy_get_card ([8a71bd0](https://github.com/davegomez/fizzy-mcp/commit/8a71bd0))

### Bug Fixes

- **05-01:** Address lint warnings in card-state tool ([c3cddd1](https://github.com/davegomez/fizzy-mcp/commit/c3cddd1))
- **ci:** Use pnpm version from packageManager field ([da30114](https://github.com/davegomez/fizzy-mcp/commit/da30114))
- **ci:** Regenerate lockfile for pnpm 10.12.1 ([8412640](https://github.com/davegomez/fizzy-mcp/commit/8412640))
- **config:** Correct excludeAuthors type in changelogen config ([1e6d5f7](https://github.com/davegomez/fizzy-mcp/commit/1e6d5f7))

### Refactors

- **05-04:** Update exports to use consolidated tools ([7fc1868](https://github.com/davegomez/fizzy-mcp/commit/7fc1868))
- **05-04:** Remove deprecated card tool definitions ([6245b3c](https://github.com/davegomez/fizzy-mcp/commit/6245b3c))
- Consolidate 29 MCP tools to 8 outcome-focused tools ([a9943ba](https://github.com/davegomez/fizzy-mcp/commit/a9943ba))

### Documentation

- **04-01:** Enhance identity tool descriptions ([2098c6a](https://github.com/davegomez/fizzy-mcp/commit/2098c6a))
- **04-03:** Enhance column tool descriptions ([5f1533a](https://github.com/davegomez/fizzy-mcp/commit/5f1533a))
- **04-03:** Enhance tag tool description ([2ceae3d](https://github.com/davegomez/fizzy-mcp/commit/2ceae3d))
- **04-01:** Enhance board tool descriptions ([d50aaac](https://github.com/davegomez/fizzy-mcp/commit/d50aaac))
- **04-05:** Enhance attach_file tool description ([70351a7](https://github.com/davegomez/fizzy-mcp/commit/70351a7))
- **08-04:** List enum values at start of action description ([204f48d](https://github.com/davegomez/fizzy-mcp/commit/204f48d))
- Add CLAUDE.md with project guidance ([2649900](https://github.com/davegomez/fizzy-mcp/commit/2649900))
- Add explanatory comments for non-obvious behavior ([aa7c90d](https://github.com/davegomez/fizzy-mcp/commit/aa7c90d))
- Add comprehensive README with tool reference ([a956097](https://github.com/davegomez/fizzy-mcp/commit/a956097))
- Add contributor guide with tool scaffolding walkthrough ([30357ea](https://github.com/davegomez/fizzy-mcp/commit/30357ea))
- Use pnpm commands ([8a1029a](https://github.com/davegomez/fizzy-mcp/commit/8a1029a))
- Add conventional commits guidelines ([cd373a4](https://github.com/davegomez/fizzy-mcp/commit/cd373a4))
- Document card_id parameter in README ([b9a9cc4](https://github.com/davegomez/fizzy-mcp/commit/b9a9cc4))

### Build

- Enforce pnpm as exclusive package manager ([fd5cbfa](https://github.com/davegomez/fizzy-mcp/commit/fd5cbfa))

### Chore

- Initial commit ([e066759](https://github.com/davegomez/fizzy-mcp/commit/e066759))
- **01-01:** Initialize project with Biome, Vitest, msw ([54618df](https://github.com/davegomez/fizzy-mcp/commit/54618df))
- Untrack .claude/settings.local.json ([523299a](https://github.com/davegomez/fizzy-mcp/commit/523299a))
- Add changelogen for automated releases ([e63ab44](https://github.com/davegomez/fizzy-mcp/commit/e63ab44))

### Tests

- **03-02:** Add failing tests for updateComment and deleteComment ([7a53382](https://github.com/davegomez/fizzy-mcp/commit/7a53382))
- **03-09:** Add attachFileTool tests ([9def626](https://github.com/davegomez/fizzy-mcp/commit/9def626))
- **05-03:** Update tests for consolidated defaultAccountTool ([964f15f](https://github.com/davegomez/fizzy-mcp/commit/964f15f))
- **05-01:** Add comprehensive tests for card state tool ([05af601](https://github.com/davegomez/fizzy-mcp/commit/05af601))
- **05-02:** Add tests for fizzy_toggle_card_attribute tool ([df056c6](https://github.com/davegomez/fizzy-mcp/commit/df056c6))
- **06-02:** Update tests for new error message format ([5afcb3c](https://github.com/davegomez/fizzy-mcp/commit/5afcb3c))
- **06-04:** Add toUserError tests for 401 and 403 errors ([db2c146](https://github.com/davegomez/fizzy-mcp/commit/db2c146))
- **06-04:** Add toUserError tests for 404 errors ([9838a86](https://github.com/davegomez/fizzy-mcp/commit/9838a86))
- **06-04:** Add toUserError tests for 422, 429, and generic errors ([0ed0c18](https://github.com/davegomez/fizzy-mcp/commit/0ed0c18))
- **07-04:** Add pagination schema tests ([ff1755f](https://github.com/davegomez/fizzy-mcp/commit/ff1755f))
- **07-04:** Add cursor encode/decode tests ([a9aa3fd](https://github.com/davegomez/fizzy-mcp/commit/a9aa3fd))
- **07-04:** Update tests for paginated list methods ([0212425](https://github.com/davegomez/fizzy-mcp/commit/0212425))
- **08-01:** Add test for position default behavior ([d31e330](https://github.com/davegomez/fizzy-mcp/commit/d31e330))
- **client:** Add getCardById tests ([abbd02d](https://github.com/davegomez/fizzy-mcp/commit/abbd02d))
- **mocks:** Support card lookup by ID ([5a41138](https://github.com/davegomez/fizzy-mcp/commit/5a41138))
- **tools:** Add card_id parameter tests ([3b41412](https://github.com/davegomez/fizzy-mcp/commit/3b41412))

### Styles

- Format tag tools files ([2a20b74](https://github.com/davegomez/fizzy-mcp/commit/2a20b74))
- **05-04:** Format import ordering and line length ([8fb1de3](https://github.com/davegomez/fizzy-mcp/commit/8fb1de3))
- **07-04:** Fix import ordering in pagination schema tests ([c486769](https://github.com/davegomez/fizzy-mcp/commit/c486769))

### ❤️ Contributors

- David Gomez <code@davidgomez.dev>

## v1.0.0

Initial release.
