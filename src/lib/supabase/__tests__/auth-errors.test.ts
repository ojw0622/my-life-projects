import { describe, expect, it } from "vitest";

import { authErrorMessage, CONNECTION_ERROR_MESSAGE, isConnectionError } from "../auth-errors";

describe("authErrorMessage", () => {
  it("explains an unreachable Supabase instead of showing 'fetch failed'", () => {
    const error = { name: "AuthRetryableFetchError", message: "fetch failed", status: 0 };
    expect(isConnectionError(error)).toBe(true);
    expect(authErrorMessage(error)).toBe(CONNECTION_ERROR_MESSAGE);
  });

  it("does not treat a retryable HTTP error as a connection failure", () => {
    const error = { name: "AuthRetryableFetchError", message: "Bad Gateway", status: 502 };
    expect(isConnectionError(error)).toBe(false);
    expect(authErrorMessage(error)).toContain("인증 서버에 문제가");
  });

  it.each([
    ["invalid_credentials", "이메일 또는 비밀번호가 올바르지 않습니다."],
    ["user_already_exists", "이미 가입된 이메일입니다. 로그인하세요."],
    ["email_not_confirmed", "이메일 확인이 필요합니다. 가입 확인 메일의 링크를 눌러주세요."],
  ])("maps code %s", (code, message) => {
    expect(authErrorMessage({ name: "AuthApiError", message: "x", status: 400, code })).toBe(message);
  });

  it("recognises known messages when the API omits the error code", () => {
    expect(authErrorMessage({ message: "Invalid login credentials", status: 400 })).toBe(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
    expect(authErrorMessage({ message: "User already registered", status: 422 })).toBe(
      "이미 가입된 이메일입니다. 로그인하세요.",
    );
  });

  it("maps rate limiting and falls back to the original message", () => {
    expect(authErrorMessage({ message: "slow down", status: 429 })).toContain("잠시 후");
    expect(authErrorMessage({ message: "Something specific", status: 400 })).toBe("Something specific");
  });
});
