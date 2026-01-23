import { HttpResponse, http } from "msw";

const BASE_URL = "https://app.fizzy.do";

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

		const body = (await request.json()) as { board?: { name?: string; description?: string } };
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

			const body = (await request.json()) as { board?: { name?: string; description?: string } };

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
];
