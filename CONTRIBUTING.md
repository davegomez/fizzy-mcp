# Contributing

## Prerequisites

- **Node.js 24+**
- **pnpm** via [Corepack](https://nodejs.org/api/corepack.html):
  ```bash
  corepack enable
  ```
  Corepack reads the `packageManager` field in `package.json` and ensures the correct pnpm version is used automatically.

## How to Set Up the Development Environment

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/davegomez/fizzy-mcp.git
   cd fizzy-mcp
   pnpm install
   ```

2. Verify setup:
   ```bash
   pnpm check
   ```
   You should see `Checked N files` with no errors.

3. Run tests:
   ```bash
   pnpm test:run
   ```
   All 373 tests should pass.

## How to Add a New Tool

1. Create the tool file `src/tools/yourfeature.ts`:
   ```typescript
   import { UserError } from "fastmcp";
   import { z } from "zod";
   import { getFizzyClient, toUserError } from "../client/index.js";
   import { getDefaultAccount } from "../state/session.js";
   import { isErr } from "../types/result.js";

   function resolveAccount(accountSlug?: string): string {
     const slug = (accountSlug || getDefaultAccount())?.replace(/^\//, "");
     if (!slug) {
       throw new UserError(
         "No account specified and no default set. Use fizzy_account first.",
       );
     }
     return slug;
   }

   export const yourFeatureTool = {
     name: "fizzy_your_feature",
     description: `One-line summary.

   **When to use:**
   - Scenario 1
   - Scenario 2

   **Arguments:**
   - \`account_slug\` (optional): Uses session default if omitted
   - \`required_param\` (required): Description

   **Returns:** JSON with fields.`,
     parameters: z.object({
       account_slug: z.string().optional(),
       required_param: z.string(),
     }),
     execute: async (args: { account_slug?: string; required_param: string }) => {
       const slug = resolveAccount(args.account_slug);
       const client = getFizzyClient();
       // Implementation
     },
   };
   ```

2. Export from `src/tools/index.ts`:
   ```typescript
   export { yourFeatureTool } from "./yourfeature.js";
   ```

3. Register in `src/server.ts`:
   ```typescript
   import { yourFeatureTool } from "./tools/index.js";
   // ...
   server.addTool(yourFeatureTool);
   ```

4. Add tests in `src/tools/yourfeature.test.ts`:
   ```typescript
   import { http, HttpResponse } from "msw";
   import { describe, expect, it } from "vitest";
   import { server } from "../test/mocks/server.js";
   import { yourFeatureTool } from "./yourfeature.js";

   describe("fizzy_your_feature", () => {
     it("does expected behavior", async () => {
       server.use(
         http.get("https://app.fizzy.do/test-account/endpoint", () =>
           HttpResponse.json({ /* mock */ })
         )
       );

       const result = await yourFeatureTool.execute({
         account_slug: "test-account",
         required_param: "value",
       });

       expect(JSON.parse(result)).toMatchObject({ /* expected */ });
     });
   });
   ```

5. Verify:
   ```bash
   pnpm check && pnpm test:run
   ```

## How to Submit a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make atomic commits using [Conventional Commits](https://www.conventionalcommits.org/) format:
   ```bash
   git commit -m "feat(tools): add fizzy_your_feature tool"
   ```

3. Run all checks before pushing:
   ```bash
   pnpm check && pnpm test:run
   ```

4. Push and create PR:
   ```bash
   git push -u origin feature/your-feature
   gh pr create
   ```

## How to Release a New Version

Releases are automated via [changelogen](https://github.com/unjs/changelogen) and GitHub Actions. The version bump is determined by commit types since the last tag.

1. Preview the release locally (commits and tags locally, does not push):
   ```bash
   pnpm release:dry
   ```

2. If everything looks good, reset the local changes and run the actual release:
   ```bash
   git reset --hard HEAD~1 && git tag -d v<version>
   pnpm release
   ```

   This bumps the version in `package.json`, updates `CHANGELOG.md`, commits, tags, and pushes to the remote.

3. The tag push triggers the Release workflow, which runs CI, publishes to npm, and creates a GitHub Release.

---

## Architecture Reference

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| `src/client/` | HTTP client returning `Result<T, FizzyApiError>` |
| `src/schemas/` | Zod schemas for API types |
| `src/tools/` | MCP tool definitions |
| `src/types/` | Shared utilities (`Result` ADT) |
| `src/state/` | Session state (default account) |

### Client Layer

| File | Purpose |
|------|---------|
| `fizzy.ts` | HTTP client with all API methods. Singleton via `getFizzyClient()`. |
| `errors.ts` | Error types (`AuthenticationError`, `NotFoundError`, etc.) and `toUserError()` conversion. |
| `markdown.ts` | `markdownToHtml()` and `htmlToMarkdown()` for content conversion. |
| `pagination.ts` | `encodeCursor()` / `decodeCursor()` for opaque pagination. |
| `upload.ts` | Direct upload handling for attachments. |

### Schemas Layer

Each domain follows this pattern:

| Schema | Purpose |
|--------|---------|
| `EntitySchema` | Full entity shape from API responses |
| `CreateEntityInputSchema` | Payload for creation endpoints |
| `UpdateEntityInputSchema` | Partial payload for update endpoints |

### Tool Structure

```typescript
{
  name: string;           // "fizzy_" prefix, snake_case
  description: string;    // Includes when-to-use, arguments, returns
  parameters: ZodObject;  // Input validation schema
  execute: (args) => Promise<string>;  // Returns JSON string
}
```

### Result ADT

| Function | Signature |
|----------|-----------|
| `ok(value)` | `<T>(value: T) => Result<T, never>` |
| `err(error)` | `<E>(error: E) => Result<never, E>` |
| `isOk(result)` | `<T, E>(result: Result<T, E>) => result is Ok<T>` |
| `isErr(result)` | `<T, E>(result: Result<T, E>) => result is Err<E>` |

### Error Types

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `AuthenticationError` | 401 | Invalid or missing token |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `ValidationError` | 422 | Invalid request data |
| `RateLimitError` | 429 | Too many requests |

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run with tsx (live reload) |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm test` | Vitest watch mode |
| `pnpm test:run` | Run tests once |
| `pnpm lint` | Check with Biome |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm check` | Lint + typecheck (CI-ready) |
| `pnpm release` | Bump version, update changelog, commit, tag, and push |
| `pnpm release:dry` | Same as `release` but without pushing (local preview) |

### Running Specific Tests

```bash
pnpm test -- src/client/fizzy.test.ts     # Single file
pnpm test -- -t "creates a card"          # By test name pattern
```

---

## Code Style Reference

| Rule | Value |
|------|-------|
| Formatter | Biome |
| Indentation | Tabs |
| Quotes | Double |
| TypeScript | Strict mode |
| Error handling | `Result<T, E>` over exceptions |
| Tool naming | `fizzy_` prefix, snake_case |
