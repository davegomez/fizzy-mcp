import { beforeEach, describe, expect, test } from "vitest";
import {
	clearDefaultAccount,
	getDefaultAccount,
	setDefaultAccount,
} from "./session.js";

describe("session state", () => {
	beforeEach(() => {
		clearDefaultAccount();
	});

	test("should return undefined when no default account set", () => {
		expect(getDefaultAccount()).toBeUndefined();
	});

	test("should store and retrieve default account", () => {
		setDefaultAccount("897362094");
		expect(getDefaultAccount()).toBe("897362094");
	});

	test("should overwrite previous default account", () => {
		setDefaultAccount("111111111");
		setDefaultAccount("222222222");
		expect(getDefaultAccount()).toBe("222222222");
	});

	test("should clear default account", () => {
		setDefaultAccount("897362094");
		clearDefaultAccount();
		expect(getDefaultAccount()).toBeUndefined();
	});
});
