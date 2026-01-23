import { HttpResponse, http } from "msw";

const BASE_URL = "https://app.fizzy.do";

const mockColumns = [
	{
		id: "col_1",
		name: "Backlog",
		color: "#808080",
		position: 0,
		cards_count: 5,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_1",
	},
	{
		id: "col_2",
		name: "In Progress",
		color: "#0000ff",
		position: 1,
		cards_count: 3,
		created_at: "2024-01-02T00:00:00Z",
		updated_at: "2024-01-16T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_2",
	},
	{
		id: "col_3",
		name: "Done",
		color: "#00ff00",
		position: 2,
		cards_count: 10,
		created_at: "2024-01-03T00:00:00Z",
		updated_at: "2024-01-17T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_3",
	},
];

const mockCards = [
	{
		id: "card_1",
		number: 1,
		title: "Fix login bug",
		description_html: "<p>Users cannot login with SSO</p>",
		status: "open",
		board_id: "board_1",
		column_id: "col_1",
		tags: [{ id: "tag_1", title: "Bug", color: "#ff0000" }],
		assignees: [
			{ id: "user_1", name: "Jane Doe", email_address: "jane@example.com" },
		],
		steps_count: 2,
		completed_steps_count: 1,
		comments_count: 3,
		created_at: "2024-01-10T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
		closed_at: null,
		url: "https://app.fizzy.do/897362094/cards/1",
	},
	{
		id: "card_2",
		number: 2,
		title: "Add dark mode",
		description_html: "<p>Implement dark mode theme</p>",
		status: "open",
		board_id: "board_1",
		column_id: "col_2",
		tags: [{ id: "tag_2", title: "Feature", color: "#00ff00" }],
		assignees: [],
		steps_count: 0,
		completed_steps_count: 0,
		comments_count: 1,
		created_at: "2024-01-11T00:00:00Z",
		updated_at: "2024-01-16T00:00:00Z",
		closed_at: null,
		url: "https://app.fizzy.do/897362094/cards/2",
	},
	{
		id: "card_3",
		number: 3,
		title: "Write API docs",
		description_html: null,
		status: "closed",
		board_id: "board_1",
		column_id: "col_3",
		tags: [{ id: "tag_3", title: "Documentation", color: "#0000ff" }],
		assignees: [
			{ id: "user_2", name: "John Smith", email_address: "john@example.com" },
		],
		steps_count: 5,
		completed_steps_count: 5,
		comments_count: 0,
		created_at: "2024-01-05T00:00:00Z",
		updated_at: "2024-01-20T00:00:00Z",
		closed_at: "2024-01-20T00:00:00Z",
		url: "https://app.fizzy.do/897362094/cards/3",
	},
	{
		id: "card_4",
		number: 4,
		title: "Inbox card",
		description_html: "<p>Card in inbox</p>",
		status: "open",
		board_id: "board_2",
		column_id: null,
		tags: [],
		assignees: [],
		steps_count: 0,
		completed_steps_count: 0,
		comments_count: 0,
		created_at: "2024-01-12T00:00:00Z",
		updated_at: "2024-01-12T00:00:00Z",
		closed_at: null,
		url: "https://app.fizzy.do/897362094/cards/4",
	},
];

const mockTags = [
	{
		id: "tag_1",
		title: "Bug",
		color: "#ff0000",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
	},
	{
		id: "tag_2",
		title: "Feature",
		color: "#00ff00",
		created_at: "2024-01-02T00:00:00Z",
		updated_at: "2024-01-16T00:00:00Z",
	},
	{
		id: "tag_3",
		title: "Documentation",
		color: "#0000ff",
		created_at: "2024-01-03T00:00:00Z",
		updated_at: "2024-01-17T00:00:00Z",
	},
];

const mockBoards = [
	{
		id: "board_1",
		name: "Project Alpha",
		slug: "project-alpha",
		description: "Main project board",
		columns: [
			{
				id: "col_1",
				name: "Backlog",
				color: "gray",
				cards_count: 5,
				position: 0,
			},
			{
				id: "col_2",
				name: "In Progress",
				color: "blue",
				cards_count: 3,
				position: 1,
			},
			{
				id: "col_3",
				name: "Done",
				color: "green",
				cards_count: 10,
				position: 2,
			},
		],
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-15T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_1",
	},
	{
		id: "board_2",
		name: "Project Beta",
		slug: "project-beta",
		description: null,
		columns: [],
		created_at: "2024-02-01T00:00:00Z",
		updated_at: "2024-02-15T00:00:00Z",
		url: "https://app.fizzy.do/897362094/boards/board_2",
	},
];

export const handlers = [
	http.get(`${BASE_URL}/my/identity`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || !auth.startsWith("Bearer ")) {
			return HttpResponse.json({}, { status: 401 });
		}
		if (auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}
		return HttpResponse.json({
			accounts: [
				{
					id: "acc_123",
					name: "Test Account",
					slug: "897362094",
					created_at: "2024-01-01T00:00:00Z",
					user: {
						id: "user_123",
						name: "Test User",
						role: "owner",
						active: true,
						email_address: "test@example.com",
						created_at: "2024-01-01T00:00:00Z",
						url: "https://app.fizzy.do/users/user_123",
					},
				},
			],
		});
	}),

	http.get(`${BASE_URL}/forbidden`, () => {
		return HttpResponse.json({}, { status: 403 });
	}),

	http.get(`${BASE_URL}/not-found`, () => {
		return HttpResponse.json({}, { status: 404 });
	}),

	http.post(`${BASE_URL}/validation-error`, () => {
		return HttpResponse.json({ name: ["is required"] }, { status: 422 });
	}),

	http.get(`${BASE_URL}/rate-limited`, () => {
		return HttpResponse.json({}, { status: 429 });
	}),

	http.delete(`${BASE_URL}/no-content`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// Board handlers (specific routes before generic ones)
	http.get(`${BASE_URL}/empty-account/boards`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}
		return HttpResponse.json([]);
	}),

	http.get(
		`${BASE_URL}/:accountSlug/boards/:boardId`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const board = mockBoards.find((b) => b.id === params.boardId);
			if (!board) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json(board);
		},
	),

	http.get(`${BASE_URL}/:accountSlug/boards`, ({ request, params }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}

		const url = new URL(request.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const perPage = 1; // Small page size to test pagination

		const start = (page - 1) * perPage;
		const end = start + perPage;
		const pageData = mockBoards.slice(start, end);

		const headers: Record<string, string> = {};
		if (end < mockBoards.length) {
			headers.Link = `<${BASE_URL}/${params.accountSlug}/boards?page=${page + 1}>; rel="next"`;
		}

		return HttpResponse.json(pageData, { headers });
	}),

	http.post(`${BASE_URL}/:accountSlug/boards`, async ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}

		const body = (await request.json()) as {
			board?: { name?: string; description?: string };
		};
		if (!body.board?.name) {
			return HttpResponse.json({ name: ["can't be blank"] }, { status: 422 });
		}

		return HttpResponse.json({
			id: "board_new",
			name: body.board.name,
			slug: body.board.name.toLowerCase().replace(/\s+/g, "-"),
			description: body.board.description ?? null,
			columns: [],
			created_at: "2024-03-01T00:00:00Z",
			updated_at: "2024-03-01T00:00:00Z",
			url: `https://app.fizzy.do/897362094/boards/board_new`,
		});
	}),

	http.put(
		`${BASE_URL}/:accountSlug/boards/:boardId`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const board = mockBoards.find((b) => b.id === params.boardId);
			if (!board) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				board?: { name?: string; description?: string };
			};

			return HttpResponse.json({
				...board,
				name: body.board?.name ?? board.name,
				description: body.board?.description ?? board.description,
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	// Tag handlers
	http.get(`${BASE_URL}/empty-account/tags`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}
		return HttpResponse.json([]);
	}),

	http.get(`${BASE_URL}/:accountSlug/tags`, ({ request, params }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}

		const url = new URL(request.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const perPage = 2; // Small page size to test pagination

		const start = (page - 1) * perPage;
		const end = start + perPage;
		const pageData = mockTags.slice(start, end);

		const headers: Record<string, string> = {};
		if (end < mockTags.length) {
			headers.Link = `<${BASE_URL}/${params.accountSlug}/tags?page=${page + 1}>; rel="next"`;
		}

		return HttpResponse.json(pageData, { headers });
	}),

	// Column handlers
	http.get(
		`${BASE_URL}/empty-account/boards/:boardId/columns`,
		({ request }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}
			return HttpResponse.json([]);
		},
	),

	http.get(
		`${BASE_URL}/:accountSlug/boards/:boardId/columns/:columnId`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const column = mockColumns.find((c) => c.id === params.columnId);
			if (!column) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json(column);
		},
	),

	http.get(
		`${BASE_URL}/:accountSlug/boards/:boardId/columns`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const url = new URL(request.url);
			const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
			const perPage = 2; // Small page size to test pagination

			const start = (page - 1) * perPage;
			const end = start + perPage;
			const pageData = mockColumns.slice(start, end);

			const headers: Record<string, string> = {};
			if (end < mockColumns.length) {
				headers.Link = `<${BASE_URL}/${params.accountSlug}/boards/${params.boardId}/columns?page=${page + 1}>; rel="next"`;
			}

			return HttpResponse.json(pageData, { headers });
		},
	),

	http.post(
		`${BASE_URL}/:accountSlug/boards/:boardId/columns`,
		async ({ request }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const body = (await request.json()) as {
				column?: { name?: string; color?: string };
			};
			if (!body.column?.name) {
				return HttpResponse.json({ name: ["can't be blank"] }, { status: 422 });
			}

			return HttpResponse.json({
				id: "col_new",
				name: body.column.name,
				color: body.column.color ?? "#808080",
				position: 3,
				cards_count: 0,
				created_at: "2024-03-01T00:00:00Z",
				updated_at: "2024-03-01T00:00:00Z",
				url: "https://app.fizzy.do/897362094/boards/board_1/columns/col_new",
			});
		},
	),

	http.put(
		`${BASE_URL}/:accountSlug/boards/:boardId/columns/:columnId`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const column = mockColumns.find((c) => c.id === params.columnId);
			if (!column) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				column?: { name?: string; color?: string };
			};

			return HttpResponse.json({
				...column,
				name: body.column?.name ?? column.name,
				color: body.column?.color ?? column.color,
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	http.delete(
		`${BASE_URL}/:accountSlug/boards/:boardId/columns/:columnId`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const column = mockColumns.find((c) => c.id === params.columnId);
			if (!column) {
				return HttpResponse.json({}, { status: 404 });
			}

			return new HttpResponse(null, { status: 204 });
		},
	),

	// Card handlers
	http.get(`${BASE_URL}/empty-account/cards`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}
		return HttpResponse.json([]);
	}),

	http.get(
		`${BASE_URL}/:accountSlug/cards/:cardNumber`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json(card);
		},
	),

	http.get(`${BASE_URL}/:accountSlug/cards`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (!auth || auth === "Bearer invalid") {
			return HttpResponse.json({}, { status: 401 });
		}

		const url = new URL(request.url);
		const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
		const perPage = 2; // Small page size to test pagination

		// Apply filters
		let filteredCards = [...mockCards];

		const boardId = url.searchParams.get("board_id");
		if (boardId) {
			filteredCards = filteredCards.filter((c) => c.board_id === boardId);
		}

		const columnId = url.searchParams.get("column_id");
		if (columnId) {
			filteredCards = filteredCards.filter((c) => c.column_id === columnId);
		}

		const status = url.searchParams.get("status");
		if (status) {
			filteredCards = filteredCards.filter((c) => c.status === status);
		}

		const tagIds = url.searchParams.getAll("tag_ids[]");
		if (tagIds.length > 0) {
			filteredCards = filteredCards.filter((c) =>
				c.tags.some((t) => tagIds.includes(t.id)),
			);
		}

		const assigneeIds = url.searchParams.getAll("assignee_ids[]");
		if (assigneeIds.length > 0) {
			filteredCards = filteredCards.filter((c) =>
				c.assignees.some((a) => assigneeIds.includes(a.id)),
			);
		}

		const start = (page - 1) * perPage;
		const end = start + perPage;
		const pageData = filteredCards.slice(start, end);

		const headers: Record<string, string> = {};
		if (end < filteredCards.length) {
			// Preserve existing query params in pagination link
			const nextUrl = new URL(request.url);
			nextUrl.searchParams.set("page", String(page + 1));
			headers.Link = `<${nextUrl.toString()}>; rel="next"`;
		}

		return HttpResponse.json(pageData, { headers });
	}),

	http.post(
		`${BASE_URL}/:accountSlug/boards/:boardId/cards`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const body = (await request.json()) as {
				card?: { title?: string; description?: string };
			};
			if (!body.card?.title) {
				return HttpResponse.json(
					{ title: ["can't be blank"] },
					{ status: 422 },
				);
			}

			return HttpResponse.json({
				id: "card_new",
				number: 100,
				title: body.card.title,
				description_html: body.card.description ?? null,
				status: "open",
				board_id: params.boardId,
				column_id: null,
				tags: [],
				assignees: [],
				steps_count: 0,
				completed_steps_count: 0,
				comments_count: 0,
				created_at: "2024-03-01T00:00:00Z",
				updated_at: "2024-03-01T00:00:00Z",
				closed_at: null,
				url: "https://app.fizzy.do/897362094/cards/100",
			});
		},
	),

	http.put(
		`${BASE_URL}/:accountSlug/cards/:cardNumber`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				card?: { title?: string; description?: string };
			};

			return HttpResponse.json({
				...card,
				title: body.card?.title ?? card.title,
				description_html: body.card?.description ?? card.description_html,
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	http.delete(
		`${BASE_URL}/:accountSlug/cards/:cardNumber`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			return new HttpResponse(null, { status: 204 });
		},
	),

	// Close card (POST)
	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/close`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json({
				...card,
				status: "closed",
				closed_at: "2024-03-15T00:00:00Z",
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	// Reopen card (DELETE /close)
	http.delete(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/close`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json({
				...card,
				status: "open",
				closed_at: null,
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	// Toggle tag handler
	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/taggings`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as { tag_title?: string };
			if (!body.tag_title) {
				return HttpResponse.json(
					{ tag_title: ["can't be blank"] },
					{ status: 422 },
				);
			}

			return new HttpResponse(null, { status: 204 });
		},
	),

	// Toggle assignee handler
	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/assignees`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as { user_id?: string };
			if (!body.user_id) {
				return HttpResponse.json(
					{ user_id: ["can't be blank"] },
					{ status: 422 },
				);
			}

			return new HttpResponse(null, { status: 204 });
		},
	),

	// Triage card (POST)
	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				column_id?: string;
				position?: string;
			};
			if (!body.column_id) {
				return HttpResponse.json(
					{ column_id: ["can't be blank"] },
					{ status: 422 },
				);
			}

			return HttpResponse.json({
				...card,
				column_id: body.column_id,
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	// Untriage card (DELETE)
	http.delete(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/triage`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json({
				...card,
				column_id: null,
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	// Not Now card (POST)
	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/not_now`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			return HttpResponse.json({
				...card,
				status: "deferred",
				updated_at: "2024-03-15T00:00:00Z",
			});
		},
	),

	// Comment handlers
	http.get(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/comments`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			// Card 4 has no comments
			if (cardNumber === 4) {
				return HttpResponse.json([]);
			}

			const url = new URL(request.url);
			const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
			const perPage = 2;

			// Mock comments for card 1 (oldest first, as API returns)
			const mockComments = [
				{
					id: "comment_1",
					created_at: "2024-01-10T00:00:00Z",
					updated_at: "2024-01-10T00:00:00Z",
					body: { plain_text: "First comment", html: "<p>First comment</p>" },
					creator: {
						id: "user_1",
						name: "Jane Doe",
						email_address: "jane@example.com",
						role: "owner",
						active: true,
					},
					card: { id: card.id, url: card.url },
					reactions_url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_1/reactions`,
					url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_1`,
				},
				{
					id: "comment_2",
					created_at: "2024-01-11T00:00:00Z",
					updated_at: "2024-01-11T00:00:00Z",
					body: { plain_text: "Second comment", html: "<p>Second comment</p>" },
					creator: {
						id: "user_2",
						name: "John Smith",
						email_address: "john@example.com",
						role: "member",
						active: true,
					},
					card: { id: card.id, url: card.url },
					reactions_url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_2/reactions`,
					url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_2`,
				},
				{
					id: "comment_3",
					created_at: "2024-01-12T00:00:00Z",
					updated_at: "2024-01-12T00:00:00Z",
					body: { plain_text: "Third comment", html: "<p>Third comment</p>" },
					creator: {
						id: "user_1",
						name: "Jane Doe",
						email_address: "jane@example.com",
						role: "owner",
						active: true,
					},
					card: { id: card.id, url: card.url },
					reactions_url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_3/reactions`,
					url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_3`,
				},
			];

			const start = (page - 1) * perPage;
			const end = start + perPage;
			const pageData = mockComments.slice(start, end);

			const headers: Record<string, string> = {};
			if (end < mockComments.length) {
				const nextUrl = new URL(request.url);
				nextUrl.searchParams.set("page", String(page + 1));
				headers.Link = `<${nextUrl.toString()}>; rel="next"`;
			}

			return HttpResponse.json(pageData, { headers });
		},
	),

	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/comments`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				comment?: { body?: string };
			};

			return HttpResponse.json({
				id: "comment_new",
				created_at: "2024-03-15T00:00:00Z",
				updated_at: "2024-03-15T00:00:00Z",
				body: {
					plain_text: "New comment",
					html: body.comment?.body ?? "<p>New comment</p>",
				},
				creator: {
					id: "user_1",
					name: "Jane Doe",
					email_address: "jane@example.com",
					role: "owner",
					active: true,
				},
				card: { id: card.id, url: card.url },
				reactions_url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_new/reactions`,
				url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/comment_new`,
			});
		},
	),

	http.put(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/comments/:commentId`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			// Simulate 403 for non-author
			if (params.commentId === "comment_other_user") {
				return HttpResponse.json({}, { status: 403 });
			}

			// Simulate 404 for nonexistent comment
			if (params.commentId === "nonexistent") {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				comment?: { body?: string };
			};

			return HttpResponse.json({
				id: params.commentId,
				created_at: "2024-01-10T00:00:00Z",
				updated_at: "2024-03-15T00:00:00Z",
				body: {
					plain_text: "Updated content",
					html: body.comment?.body ?? "<p>Updated content</p>",
				},
				creator: {
					id: "user_1",
					name: "Jane Doe",
					email_address: "jane@example.com",
					role: "owner",
					active: true,
				},
				card: {
					id: card.id,
					url: card.url,
				},
				reactions_url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/${params.commentId}/reactions`,
				url: `${BASE_URL}/${params.accountSlug}/cards/${params.cardNumber}/comments/${params.commentId}`,
			});
		},
	),

	http.delete(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/comments/:commentId`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			// Simulate 403 for non-author
			if (params.commentId === "comment_other_user") {
				return HttpResponse.json({}, { status: 403 });
			}

			// Simulate 404 for nonexistent comment
			if (params.commentId === "nonexistent") {
				return HttpResponse.json({}, { status: 404 });
			}

			return new HttpResponse(null, { status: 204 });
		},
	),

	// Step handlers
	http.post(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/steps`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				step?: { content?: string; completed?: boolean };
			};

			if (!body.step?.content) {
				return HttpResponse.json(
					{ content: ["can't be blank"] },
					{ status: 422 },
				);
			}

			return HttpResponse.json({
				id: "step_new",
				content: body.step.content,
				completed: body.step.completed ?? false,
			});
		},
	),

	http.put(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/steps/:stepId`,
		async ({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			if (params.stepId === "nonexistent") {
				return HttpResponse.json({}, { status: 404 });
			}

			const body = (await request.json()) as {
				step?: { content?: string; completed?: boolean };
			};

			return HttpResponse.json({
				id: params.stepId,
				content: body.step?.content ?? "Original content",
				completed: body.step?.completed ?? false,
			});
		},
	),

	http.delete(
		`${BASE_URL}/:accountSlug/cards/:cardNumber/steps/:stepId`,
		({ request, params }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const cardNumber = Number(params.cardNumber);
			const card = mockCards.find((c) => c.number === cardNumber);
			if (!card) {
				return HttpResponse.json({}, { status: 404 });
			}

			if (params.stepId === "nonexistent") {
				return HttpResponse.json({}, { status: 404 });
			}

			return new HttpResponse(null, { status: 204 });
		},
	),

	// Direct upload handler
	http.post(
		`${BASE_URL}/:accountSlug/rails/active_storage/direct_uploads`,
		async ({ request }) => {
			const auth = request.headers.get("Authorization");
			if (!auth || auth === "Bearer invalid") {
				return HttpResponse.json({}, { status: 401 });
			}

			const body = (await request.json()) as {
				blob?: {
					filename?: string;
					byte_size?: number;
					checksum?: string;
					content_type?: string;
				};
			};

			if (!body.blob?.filename || !body.blob?.checksum) {
				return HttpResponse.json({ blob: ["is invalid"] }, { status: 422 });
			}

			return HttpResponse.json({
				signed_id: `signed_${body.blob.filename}_${Date.now()}`,
				direct_upload: {
					url: "https://storage.example.com/upload",
					headers: {
						"Content-Type":
							body.blob.content_type ?? "application/octet-stream",
						"Content-MD5": body.blob.checksum,
					},
				},
			});
		},
	),

	// Mock storage upload endpoint
	http.put("https://storage.example.com/upload", () => {
		return new HttpResponse(null, { status: 200 });
	}),

	http.put("https://storage.example.com/upload-fail", () => {
		return HttpResponse.json({ error: "Upload failed" }, { status: 500 });
	}),
];
