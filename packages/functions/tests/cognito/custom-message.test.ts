import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const exchangeCognitoSub = vi.fn();

vi.mock("@console/core/user", () => ({ create, exchangeCognitoSub }));

const { handler } = await import("../../src/cognito/custom-message");

describe("Cognito custom-message trigger", () => {
	beforeEach(() => vi.clearAllMocks());

	it("provisions admin-created users before Cognito sends their invite", async () => {
		const event = {
			triggerSource: "CustomMessage_AdminCreateUser",
			request: {
				userAttributes: {
					sub: "cognito-sub",
					email: "person@example.com"
				}
			},
			response: {}
		};
		exchangeCognitoSub.mockResolvedValue(null);

		await expect(
			handler(event as never, {} as never, () => {})
		).resolves.toBe(event);
		expect(create).toHaveBeenCalledWith({
			cognitoSub: "cognito-sub",
			email: "person@example.com",
			cognitoStatus: "FORCE_CHANGE_PASSWORD",
			cognitoEnabled: true
		});
	});

	it("does not provision non-invite messages", async () => {
		const event = {
			triggerSource: "CustomMessage_ForgotPassword",
			request: { userAttributes: {} },
			response: {}
		};

		await expect(
			handler(event as never, {} as never, () => {})
		).resolves.toBe(event);
		expect(create).not.toHaveBeenCalled();
	});

	it("does not recreate a user mapped to Cognito", async () => {
		const event = {
			triggerSource: "CustomMessage_AdminCreateUser",
			request: {
				userAttributes: {
					sub: "cognito-sub",
					email: "person@example.com"
				}
			},
			response: {}
		};
		exchangeCognitoSub.mockResolvedValue("01ARZ3NDEKTSV4RRFFQ69G5FAV");

		await expect(
			handler(event as never, {} as never, () => {})
		).resolves.toBe(event);
		expect(create).not.toHaveBeenCalled();
	});

	it("accepts concurrent creation when another trigger wins", async () => {
		const event = {
			triggerSource: "CustomMessage_AdminCreateUser",
			request: {
				userAttributes: {
					sub: "cognito-sub",
					email: "person@example.com"
				}
			},
			response: {}
		};
		exchangeCognitoSub
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce("01ARZ3NDEKTSV4RRFFQ69G5FAV");
		create.mockRejectedValue(new Error("conditional write failed"));

		await expect(
			handler(event as never, {} as never, () => {})
		).resolves.toBe(event);
	});
});
