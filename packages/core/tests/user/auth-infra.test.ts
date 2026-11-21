import { describe, expect, it, vi } from "vitest";

const { poolArgs } = vi.hoisted(() => ({ poolArgs: vi.fn() }));

vi.mock("../../../../console.config", () => ({
	default: { auth: { passwordPolicy: {} } }
}));
vi.mock("../../../../infra/storage", () => ({ consoleData: {} }));

vi.stubGlobal("$app", { stage: "test" });
vi.stubGlobal("sst", {
	aws: {
		CognitoUserPool: class {
			constructor(_name: string, args: unknown) {
				poolArgs(args);
			}
			addClient() {
				return {};
			}
		}
	}
});

describe("Cognito invitation defaults", () => {
	it("provides a valid SMS message alongside the email template", async () => {
		await vi.importActual("../../../../infra/auth");
		const template =
			poolArgs.mock.calls[0]?.[0].transform.userPool.adminCreateUserConfig
				.inviteMessageTemplate;
		expect(template.smsMessage).toEqual(expect.any(String));
		expect(template.smsMessage.length).toBeGreaterThanOrEqual(6);
		expect(template.smsMessage).toContain("{####}");
	});
});
