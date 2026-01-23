import { HttpResponse, http } from "msw";

const BASE_URL = "https://app.fizzy.do";

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
];
