export const COOKIE_NAME = "nos_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const ERRORS = {
  UNAUTHORIZED: "로그인이 필요합니다",
  FORBIDDEN: "권한이 없습니다",
  NOT_FOUND: "찾을 수 없습니다",
  INVALID_ACCESS_CODE: "접근 코드가 올바르지 않습니다",
  INVALID_INVITE_CODE: "유효하지 않은 초대 코드입니다",
  TOUR_NOT_FOUND: "투어를 찾을 수 없습니다",
  DB_ERROR: "데이터베이스 오류가 발생했습니다",
} as const;
