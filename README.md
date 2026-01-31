# fizzy-mcp

MCP server for [Fizzy](https://fizzy.do) task management. Exposes 7 tools for managing boards, cards, comments, and checklists.

## Prerequisites

Get your Fizzy access token:

1. Log in to [Fizzy](https://app.fizzy.do)
2. Go to Settings > API Access
3. Generate a new token

## How to Install

<details>
<summary><b>Claude Desktop</b></summary>

Add to your config file:

- **macOS:** `~/Library/Application\ Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "Fizzy": {
      "command": "npx",
      "args": ["-y", "@silky/fizzy-mcp"],
      "env": {
        "FIZZY_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Windows only:** Add `"APPDATA": "C:\\Users\\YourUsername\\AppData\\Roaming"` to the `env` block.

Restart Claude Desktop completely, then verify: "List my Fizzy boards."

</details>

<details>
<summary><b>Claude Code</b></summary>

Use the CLI:

```bash
claude mcp add --transport stdio Fizzy --env FIZZY_TOKEN=your-token-here -- npx -y @silky/fizzy-mcp
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "Fizzy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@silky/fizzy-mcp"],
      "env": {
        "FIZZY_TOKEN": "your-token-here"
      }
    }
  }
}
```

Restart Claude Code, then verify: "List my Fizzy boards."

</details>

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "Fizzy": {
      "command": "npx",
      "args": ["-y", "@silky/fizzy-mcp"],
      "env": {
        "FIZZY_TOKEN": "your-token-here"
      }
    }
  }
}
```

Restart Cursor completely, then verify in Agent mode (Ctrl+I).

</details>

<details>
<summary><b>VS Code</b></summary>

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "fizzy-token",
      "description": "Fizzy API Token",
      "password": true
    }
  ],
  "servers": {
    "Fizzy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@silky/fizzy-mcp"],
      "env": {
        "FIZZY_TOKEN": "${input:fizzy-token}"
      }
    }
  }
}
```

Or use user settings via Command Palette → "MCP: Open User Configuration".

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "Fizzy": {
      "command": "npx",
      "args": ["-y", "@silky/fizzy-mcp"],
      "env": {
        "FIZZY_TOKEN": "${env:FIZZY_TOKEN}"
      }
    }
  }
}
```

Set `FIZZY_TOKEN` in your shell environment, or hardcode the value. Restart Windsurf.

</details>

<details>
<summary><b>Cline</b></summary>

Add to the Cline MCP settings file:

- **macOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows:** `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Linux:** `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "Fizzy": {
      "command": "npx",
      "args": ["-y", "@silky/fizzy-mcp"],
      "env": {
        "FIZZY_TOKEN": "your-token-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

</details>

<details>
<summary><b>Continue</b></summary>

Add to `.continue/config.yaml`:

```yaml
mcpServers:
  - name: Fizzy
    command: npx
    args:
      - "-y"
      - "@silky/fizzy-mcp"
    env:
      FIZZY_TOKEN: ${{ secrets.FIZZY_TOKEN }}
```

</details>

<details>
<summary><b>From Source</b></summary>

**Requires [pnpm](https://pnpm.io/).**

```bash
git clone https://github.com/davegomez/fizzy-mcp.git
cd fizzy-mcp
pnpm install
pnpm build
```

Replace `npx -y @silky/fizzy-mcp` with `node /absolute/path/to/fizzy-mcp/dist/index.js` in any config above.

</details>

---

## Configuration Reference

| Variable         | Required | Default                | Description                              |
| ---------------- | -------- | ---------------------- | ---------------------------------------- |
| `FIZZY_TOKEN`    | Yes      | —                      | API token from Fizzy settings            |
| `FIZZY_ACCOUNT`  | No       | —                      | Default account slug (e.g., `897362094`) |
| `FIZZY_BASE_URL` | No       | `https://app.fizzy.do` | API base URL                             |

### Account Resolution

Tools resolve `account_slug` in this order:

1. Explicit `account_slug` parameter on the tool call
2. Session default (set via `fizzy_account` tool with `action: "set"`)
3. `FIZZY_ACCOUNT` environment variable
4. Auto-detect (if user has exactly one account)

---

## Tools Reference

### fizzy_account

Gets, sets, or lists accounts for subsequent tool calls.

| Parameter      | Type                           | Required  | Description                 |
| -------------- | ------------------------------ | --------- | --------------------------- |
| `action`       | `"get"` \| `"set"` \| `"list"` | Yes       | Action to perform           |
| `account_slug` | string                         | For `set` | Account slug from Fizzy URL |

**Returns:**

- `get`: `{ "action": "get", "account_slug": "897362094" | null }`
- `set`: `{ "action": "set", "account_slug": "897362094" }`
- `list`: `{ "action": "list", "accounts": [{ "slug": "...", "name": "...", "id": "..." }] }`

---

### fizzy_boards

Lists boards in the account with column summaries.

| Parameter      | Type   | Required | Default         | Description            |
| -------------- | ------ | -------- | --------------- | ---------------------- |
| `account_slug` | string | No       | Session default | Account slug           |
| `limit`        | number | No       | 25              | Items per page (1-100) |
| `cursor`       | string | No       | —               | Pagination cursor      |

**Returns:** `{ "items": Board[], "pagination": { "returned": number, "has_more": boolean, "next_cursor"?: string } }`

---

### fizzy_search

Searches for cards with filters.

| Parameter      | Type                                                                                     | Required | Description                        |
| -------------- | ---------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `account_slug` | string                                                                                   | No       | Account slug                       |
| `board_id`     | string                                                                                   | No       | Filter by board                    |
| `tag_ids`      | string[]                                                                                 | No       | Filter by ALL tags                 |
| `assignee_ids` | string[]                                                                                 | No       | Filter by ANY assignees            |
| `indexed_by`   | `"closed"` \| `"not_now"` \| `"all"` \| `"stalled"` \| `"postponing_soon"` \| `"golden"` | No       | Filter by index                    |
| `limit`        | number                                                                                   | No       | Items per page (1-100, default 25) |
| `cursor`       | string                                                                                   | No       | Pagination cursor                  |

**Returns:** `{ "items": Card[], "pagination": {...} }`

---

### fizzy_get_card

Gets full details of a card by number or ID.

| Parameter      | Type   | Required | Description                                  |
| -------------- | ------ | -------- | -------------------------------------------- |
| `account_slug` | string | No       | Account slug                                 |
| `card_number`  | number | No\*     | Card number from URL (e.g., `42` from `#42`) |
| `card_id`      | string | No\*     | Card UUID from API responses                 |

\*Provide `card_number` OR `card_id`. Prefer `card_number` when you have the human-readable `#` from the UI.

**Returns:** Card object with `id`, `number`, `title`, `description` (markdown), `status`, `board_id`, `column_id`, `tags`, `assignees`, `steps_count`, `completed_steps_count`, `comments_count`, `url`, timestamps.

---

### fizzy_task

Creates or updates a card.

**Mode:** Omit `card_number` to create; include it to update.

| Parameter      | Type                                  | Required    | Description                              |
| -------------- | ------------------------------------- | ----------- | ---------------------------------------- |
| `account_slug` | string                                | No          | Account slug                             |
| `card_number`  | number                                | No          | Card to update (omit to create)          |
| `board_id`     | string                                | Create mode | Board for new card                       |
| `title`        | string                                | Create mode | Card title                               |
| `description`  | string                                | No          | Markdown content                         |
| `status`       | `"open"` \| `"closed"` \| `"not_now"` | No          | Change card status                       |
| `column_id`    | string                                | No          | Triage to column                         |
| `position`     | `"top"` \| `"bottom"`                 | No          | Position in column (default: `"bottom"`) |
| `add_tags`     | string[]                              | No          | Tag titles to add                        |
| `remove_tags`  | string[]                              | No          | Tag titles to remove                     |
| `steps`        | string[]                              | No          | Checklist items (create mode only)       |

**Returns:** `{ "mode": "create" | "update", "card": {...}, "operations": {...}, "failures": [...] }`

---

### fizzy_comment

Adds a comment to a card.

| Parameter      | Type   | Required | Description                         |
| -------------- | ------ | -------- | ----------------------------------- |
| `account_slug` | string | No       | Account slug                        |
| `card_number`  | number | Yes      | Card to comment on                  |
| `body`         | string | Yes      | Comment in markdown (1-10000 chars) |

**Returns:** Comment object with `id`, `body` (markdown), `creator`, timestamps, `url`.

---

### fizzy_step

Create, complete, update, uncomplete, or delete a step on a card.

| Parameter      | Type             | Required | Description                                         |
| -------------- | ---------------- | -------- | --------------------------------------------------- |
| `account_slug` | string           | No       | Account slug                                        |
| `card_number`  | number           | Yes      | Card containing the step                            |
| `step`         | string \| number | No       | Content substring OR 1-based index. Omit to create. |
| `content`      | string           | No       | Step text for create or update                      |
| `completed`    | boolean          | No       | Set completion state                                |
| `delete`       | boolean          | No       | Delete the step                                     |

**Mode detection:**

- `step` absent → CREATE (requires `content`)
- `step` present, no other params → COMPLETE
- `step` + `content` → UPDATE
- `step` + `completed: false` → UNCOMPLETE
- `step` + `delete: true` → DELETE

**Returns:** `{ "id": "...", "content": "...", "completed": true }`

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

| Field         | Type    | Description                    |
| ------------- | ------- | ------------------------------ |
| `returned`    | number  | Items in this response         |
| `has_more`    | boolean | More items available           |
| `next_cursor` | string  | Pass as `cursor` for next page |

---

## Error Reference

| Error                                                                                            | Cause                                      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| "No account specified. Set FIZZY_ACCOUNT env var, use fizzy_account tool, or pass account_slug." | No account resolvable via any method       |
| "Account \"...\" not found"                                                                      | Invalid slug passed to `fizzy_account` set |
| "Card #N not found"                                                                              | Card number does not exist                 |
| "Board not found"                                                                                | Invalid `board_id`                         |

---

## License

AGPL-3.0-or-later
