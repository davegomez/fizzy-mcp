# fizzy-mcp

MCP server for [Fizzy](https://fizzy.do) task management. Exposes 8 tools for managing boards, cards, comments, and checklists.

## How to Install with Claude Desktop

1. Get your Fizzy access token:
   - Log in to [Fizzy](https://app.fizzy.do)
   - Go to Settings > API Access
   - Generate a new token

2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "fizzy": {
         "command": "npx",
         "args": ["-y", "@silky/fizzy-mcp"],
         "env": {
           "FIZZY_TOKEN": "your-token-here"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop.

4. Verify by asking Claude: "List my Fizzy boards."

## How to Install with Claude Code

1. Get your Fizzy access token from Settings > API Access in Fizzy.

2. Add to your MCP settings:
   ```json
   {
     "fizzy": {
       "command": "npx",
       "args": ["-y", "@silky/fizzy-mcp"],
       "env": {
         "FIZZY_TOKEN": "your-token-here"
       }
     }
   }
   ```

3. Restart Claude Code.

4. Verify by running: "List my Fizzy boards."

## How to Install from Source

**Requires [pnpm](https://pnpm.io/).** npm and yarn are blocked by the project configuration.

1. Clone and build:
   ```bash
   git clone https://github.com/davegomez/fizzy-mcp.git
   cd fizzy-mcp
   pnpm install
   pnpm build
   ```

2. Add to your MCP settings:
   ```json
   {
     "fizzy": {
       "command": "node",
       "args": ["/absolute/path/to/fizzy-mcp/dist/index.js"],
       "env": {
         "FIZZY_TOKEN": "your-token-here"
       }
     }
   }
   ```

3. Restart your MCP client and verify.

---

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIZZY_TOKEN` | Yes | — | API token from Fizzy settings |
| `FIZZY_BASE_URL` | No | `https://app.fizzy.do` | API base URL |

> **Note:** `FIZZY_ACCESS_TOKEN` is supported for backward compatibility but deprecated.

---

## Tools Reference

### fizzy_account

Gets or sets the default account for subsequent tool calls.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `"get"` \| `"set"` | Yes | Action to perform |
| `account_slug` | string | For `set` | Account slug from Fizzy URL |

**Returns:** `{ "action": "...", "account_slug": "..." | null }`

---

### fizzy_boards

Lists boards in the account with column summaries.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `account_slug` | string | No | Session default | Account slug |
| `limit` | number | No | 25 | Items per page (1-100) |
| `cursor` | string | No | — | Pagination cursor |

**Returns:** `{ "items": Board[], "pagination": { "returned": number, "has_more": boolean, "next_cursor"?: string } }`

---

### fizzy_search

Searches for cards with filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_slug` | string | No | Account slug |
| `board_id` | string | No | Filter by board |
| `column_id` | string | No | Filter by column |
| `tag_ids` | string[] | No | Filter by ALL tags |
| `assignee_ids` | string[] | No | Filter by ANY assignees |
| `status` | `"open"` \| `"closed"` \| `"deferred"` | No | Filter by status |
| `limit` | number | No | Items per page (1-100, default 25) |
| `cursor` | string | No | Pagination cursor |

**Returns:** `{ "items": Card[], "pagination": {...} }`

---

### fizzy_get_card

Gets full details of a card by number or ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_slug` | string | No | Account slug |
| `card_number` | number | No* | Card number from URL (e.g., `42` from `#42`) |
| `card_id` | string | No* | Card UUID from API responses |

*Provide `card_number` OR `card_id`. Prefer `card_number` when you have the human-readable `#` from the UI.

**Returns:** Card object with `id`, `number`, `title`, `description` (markdown), `status`, `board_id`, `column_id`, `tags`, `assignees`, `steps_count`, `completed_steps_count`, `comments_count`, `url`, timestamps.

---

### fizzy_task

Creates or updates a card.

**Mode:** Omit `card_number` to create; include it to update.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_slug` | string | No | Account slug |
| `card_number` | number | No | Card to update (omit to create) |
| `board_id` | string | Create mode | Board for new card |
| `title` | string | Create mode | Card title |
| `description` | string | No | Markdown content |
| `status` | `"open"` \| `"closed"` \| `"not_now"` | No | Change card status |
| `column_id` | string | No | Triage to column |
| `position` | `"top"` \| `"bottom"` | No | Position in column (default: `"bottom"`) |
| `add_tags` | string[] | No | Tag titles to add |
| `remove_tags` | string[] | No | Tag titles to remove |
| `steps` | string[] | No | Checklist items (create mode only) |

**Returns:** `{ "mode": "create" | "update", "card": {...}, "operations": {...}, "failures": [...] }`

---

### fizzy_comment

Adds a comment to a card.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_slug` | string | No | Account slug |
| `card_number` | number | Yes | Card to comment on |
| `body` | string | Yes | Comment in markdown (1-10000 chars) |

**Returns:** Comment object with `id`, `body` (markdown), `creator`, timestamps, `url`.

---

### fizzy_complete_step

Marks a checklist step as complete.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_slug` | string | No | Account slug |
| `card_number` | number | Yes | Card containing the step |
| `step` | string \| number | Yes | Content substring OR 1-based index |

**Returns:** `{ "id": "...", "content": "...", "completed": true }`

---

### fizzy_bulk_close

Closes multiple cards at once.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_slug` | string | No | Account slug |
| `card_numbers` | number[] | No | Explicit card numbers |
| `column_id` | string | No | Filter: cards in column |
| `tag_title` | string | No | Filter: cards with tag |
| `older_than_days` | number | No | Filter: cards not updated in N days |
| `force` | boolean | Yes | Must be `true` to execute |

Provide `card_numbers` OR at least one filter. Filters combine with AND.

**Returns:** `{ "closed": number[], "failed": [...], "total": number, "success_count": number }`

---

## Pagination Reference

List operations return:

```json
{
  "items": [...],
  "pagination": {
    "returned": 25,
    "has_more": true,
    "next_cursor": "opaque-cursor-string"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `returned` | number | Items in this response |
| `has_more` | boolean | More items available |
| `next_cursor` | string | Pass as `cursor` for next page |

---

## Error Reference

| Error | Cause |
|-------|-------|
| "No account specified and no default set" | No `account_slug` and `fizzy_account` not called |
| "Card #N not found" | Card number does not exist |
| "Board not found" | Invalid `board_id` |
| "Tag not found" | Invalid tag title in `fizzy_bulk_close` |
| "Bulk close requires force: true" | Missing confirmation flag |

---

## License

AGPL-3.0-or-later
