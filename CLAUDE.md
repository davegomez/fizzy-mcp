# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

**This project uses pnpm exclusively.** npm/yarn will fail at install.

```bash
pnpm build            # Compile TypeScript to dist/
pnpm dev              # Run with tsx (live development)
pnpm test             # Vitest watch mode
pnpm test:run         # Run tests once
pnpm test src/client/fizzy.test.ts  # Single test file
pnpm lint             # Check with Biome
pnpm lint:fix         # Auto-fix lint issues
pnpm check            # Lint + typecheck (CI-ready)
```

## Architecture

MCP server exposing Fizzy task management API via FastMCP. Five layers:

**Client** (`/src/client/`) - HTTP client returning `Result<T, FizzyApiError>` ADT. Singleton via `getFizzyClient()`. Handles pagination with generators, markdown↔HTML conversion.

**Schemas** (`/src/schemas/`) - Zod schemas for all API types. Pattern: `EntitySchema`, `CreateEntityInputSchema`, `UpdateEntityInputSchema` per domain.

**Tools** (`/src/tools/`) - 7 outcome-focused MCP tools registered in server.ts. Each exports tool object with `name`, `description`, `parameters` (Zod), and `execute` function. Tools: `fizzy_default_account`, `fizzy_boards`, `fizzy_search`, `fizzy_get_card`, `fizzy_task`, `fizzy_comment`, `fizzy_complete_step`.

**Types** (`/src/types/`) - Shared type utilities including `Result<T, E>` ADT with `ok()`, `err()`, `isOk()`, `isErr()` helpers.

**State** (`/src/state/`) - In-memory session state for default account slug.

## Patterns

**Result type**: Client methods return `Result<T, E>` - check with `isErr()`, extract `.value`. Lifecycle methods (`closeCard`, `reopenCard`, `triageCard`, `unTriageCard`, `notNowCard`) return `Result<void, FizzyApiError>` - API returns 204 No Content.

**Error handling**: Client returns `FizzyApiError` subclasses (AuthenticationError, NotFoundError, ValidationError, RateLimitError, ForbiddenError). Convert to `UserError` via `toUserError(error, context?)` with optional context for instructive recovery messages.

**Account resolution**: Tools accept optional `account_slug`, falling back to session default via `resolveAccount()`. Throw `UserError` if neither available.

**Content conversion**: `markdownToHtml()` for API input, `htmlToMarkdown()` for display output.

**Tool naming**: `fizzy_` prefix, snake_case (e.g., `fizzy_create_card`).

**Testing**: MSW mocks HTTP layer in `/src/test/mocks/`. Tests colocated as `.test.ts`.

## Stack

Node 24+, TypeScript strict, FastMCP, Zod v4, Vitest, MSW, Biome (tabs, double quotes).

## Documentation

When modifying project or code documentation (README, CONTRIBUTING, inline comments, JSDoc), invoke `/diataxis-documentation` to ensure content follows the Diataxis framework and serves user needs effectively.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/). No co-authoring footers.

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`.

- `feat`: new feature
- `fix`: bug fix
- `!` after type/scope indicates breaking change
- Body optional, separated by blank line
- Footers for `BREAKING CHANGE:`, issue refs, etc.
