import { HttpResponse, http } from "msw";

const BASE_URL = "https://app.fizzy.do";

export const handlers = [
	http.get(`${BASE_URL}/my/identity`, () => {
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
];
