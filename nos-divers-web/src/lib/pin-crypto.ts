/**
 * 계정 PIN 해싱 유틸 — WebCrypto SHA-256 + per-user salt.
 *
 * 저장 형식: `v1:<saltHex>:<hashHex>`
 *   - 평문 비교(레거시) 호환을 위해 verifyPin() 에서 prefix 가 없는
 *     값은 직접 비교로 폴백한다. 검증 성공 시 호출측에서 hashPin() 으로
 *     재저장하면 자동 마이그레이션이 끝난다.
 */

const STORE_PREFIX = "v1:";
const HASH_ITERATIONS = 100_000;

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

async function deriveHash(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(pin);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: HASH_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

/** 새 PIN 을 안전하게 해시한다. 결과는 DB 에 그대로 저장. */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(pin, salt);
  return `${STORE_PREFIX}${bytesToHex(salt)}:${bytesToHex(hash)}`;
}

/**
 * 입력 PIN 이 저장된 값과 일치하는지 검증.
 * `stored` 가 v1: prefix 면 해시 비교, 아니면 평문 비교(레거시).
 */
export async function verifyPin(pin: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  if (!stored.startsWith(STORE_PREFIX)) {
    // 레거시 평문 — 호출측에서 verify 성공 후 hashPin() 으로 재저장 권장.
    return pin === stored;
  }
  const parts = stored.slice(STORE_PREFIX.length).split(":");
  if (parts.length !== 2) return false;
  const [saltHex, expectedHex] = parts;
  const salt = hexToBytes(saltHex);
  const actual = await deriveHash(pin, salt);
  const expected = hexToBytes(expectedHex);
  if (actual.length !== expected.length) return false;
  // 상수 시간 비교
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/** 저장값이 레거시 평문인지 여부 (마이그레이션 트리거용) */
export function isLegacyPlain(stored: string | null | undefined): boolean {
  return !!stored && !stored.startsWith(STORE_PREFIX);
}
