/** The fields of a Supabase AuthError that decide what the user sees. */
interface AuthErrorLike {
  name?: string;
  message: string;
  status?: number;
  code?: string;
}

export const CONNECTION_ERROR_MESSAGE =
  "인증 서버(Supabase)에 연결하지 못했습니다. 잠시 후 다시 시도하고, 계속되면 배포 환경의 NEXT_PUBLIC_SUPABASE_URL 설정을 확인하세요.";

/** True when the request never reached Supabase (DNS, network, wrong URL). */
export function isConnectionError(error: AuthErrorLike): boolean {
  return error.name === "AuthRetryableFetchError" && (error.status === 0 || error.status === undefined);
}

const BY_CODE: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  email_not_confirmed: "이메일 확인이 필요합니다. 가입 확인 메일의 링크를 눌러주세요.",
  user_already_exists: "이미 가입된 이메일입니다. 로그인하세요.",
  email_exists: "이미 가입된 이메일입니다. 로그인하세요.",
  weak_password: "비밀번호가 너무 약합니다. 더 길고 복잡하게 입력하세요.",
  signup_disabled: "현재 회원가입이 비활성화되어 있습니다. Supabase Authentication 설정을 확인하세요.",
  email_provider_disabled: "이메일 가입이 비활성화되어 있습니다. Supabase Authentication 설정을 확인하세요.",
  email_address_invalid: "사용할 수 없는 이메일 주소입니다.",
  over_email_send_rate_limit: "메일 발송 한도를 넘었습니다. 잠시 후 다시 시도하세요.",
  over_request_rate_limit: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
};

/** Maps a Supabase auth error to a Korean, user-facing message. */
export function authErrorMessage(error: AuthErrorLike): string {
  if (isConnectionError(error)) return CONNECTION_ERROR_MESSAGE;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  // Older auth API versions omit `code`; fall back to the stable messages.
  if (/invalid login credentials/i.test(error.message)) return BY_CODE.invalid_credentials;
  if (/already registered/i.test(error.message)) return BY_CODE.user_already_exists;
  if (/email not confirmed/i.test(error.message)) return BY_CODE.email_not_confirmed;
  if (error.status === 429) return BY_CODE.over_request_rate_limit;
  if (error.status !== undefined && error.status >= 500) {
    return "인증 서버에 문제가 있습니다. 잠시 후 다시 시도하세요.";
  }
  return error.message;
}
