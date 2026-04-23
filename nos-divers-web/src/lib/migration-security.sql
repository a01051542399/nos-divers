-- ============================================================
-- NoS Divers / Dive ON — 보안 마이그레이션 (재실행 안전)
-- Supabase Dashboard → SQL Editor 에서 한 번만 실행
-- ============================================================
--
-- 적용 항목:
--   1. 관리자 비밀번호 해시 저장 (pgcrypto + admin_config 테이블)
--   2. Storage RLS 강화 (path 기반 tour_members 검증)
--   3. listTours N+1 쿼리 해결 (get_tours_with_details RPC)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1) 관리자 비밀번호 해시 저장
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_config (
  id INT PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT admin_config_single_row CHECK (id = 1)
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
-- 정책 없음 → SECURITY DEFINER RPC 외에는 접근 불가

-- 초기 시드 (기존 '0303' 호환). 이미 행이 있으면 변경하지 않음.
INSERT INTO admin_config (id, password_hash)
VALUES (1, crypt('0303', gen_salt('bf', 10)))
ON CONFLICT (id) DO NOTHING;

-- 해시 비교 기반 verify (signature는 기존과 동일 → 클라이언트 호환)
CREATE OR REPLACE FUNCTION verify_admin_password(p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT password_hash INTO v_hash FROM admin_config WHERE id = 1;
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 관리자 비밀번호 변경 (현재 비밀번호 확인 후)
CREATE OR REPLACE FUNCTION change_admin_password(p_old TEXT, p_new TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT password_hash INTO v_hash FROM admin_config WHERE id = 1;
  IF v_hash IS NULL OR crypt(p_old, v_hash) <> v_hash THEN
    RETURN FALSE;
  END IF;
  UPDATE admin_config
     SET password_hash = crypt(p_new, gen_salt('bf', 10)),
         updated_at = now()
   WHERE id = 1;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 2) Storage RLS 강화 (path 기반 tour 멤버십 검증)
-- ────────────────────────────────────────────────────────────
--
-- 경로 패턴:
--   receipts/{tourId}/{filename}
--   signatures/{tourId}/{filename}
-- → tour_members 에 등록된 사용자만 접근 가능
--
-- 기존 업로드된 파일도 동일 경로 패턴이므로 호환.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION storage_image_member(_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_parts TEXT[];
  v_tour_id INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_parts := string_to_array(_name, '/');
  IF array_length(v_parts, 1) < 2 THEN
    RETURN FALSE;
  END IF;

  IF v_parts[1] NOT IN ('receipts', 'signatures') THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_tour_id := v_parts[2]::INT;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  RETURN EXISTS (
    SELECT 1 FROM tour_members
    WHERE tour_id = v_tour_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "images_insert" ON storage.objects;
DROP POLICY IF EXISTS "images_select" ON storage.objects;
DROP POLICY IF EXISTS "images_update" ON storage.objects;
DROP POLICY IF EXISTS "images_delete" ON storage.objects;

CREATE POLICY "images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND storage_image_member(name));

CREATE POLICY "images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'images' AND storage_image_member(name));

CREATE POLICY "images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'images' AND storage_image_member(name));

CREATE POLICY "images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND storage_image_member(name));


-- ────────────────────────────────────────────────────────────
-- 3) N+1 해결: 투어 + 참여자 + 비용 일괄 조회
-- ────────────────────────────────────────────────────────────
--
-- listTours() 가 100개 투어 시 201개 쿼리 → 1개로 단축.
-- RLS 우회를 위해 SECURITY DEFINER + is_tour_member 명시 검증.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tours_with_details(p_include_deleted BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(t.tour_data ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT
      tours.created_at,
      jsonb_build_object(
        'tour', to_jsonb(tours),
        'participants', COALESCE(
          (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id)
             FROM participants p
            WHERE p.tour_id = tours.id),
          '[]'::jsonb
        ),
        'expenses', COALESCE(
          (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id)
             FROM expenses e
            WHERE e.tour_id = tours.id),
          '[]'::jsonb
        )
      ) AS tour_data
    FROM tours
    WHERE
      (p_include_deleted OR tours.deleted_at IS NULL)
      AND (NOT p_include_deleted OR tours.deleted_at IS NOT NULL)
      AND EXISTS (
        SELECT 1 FROM tour_members
        WHERE tour_id = tours.id AND user_id = auth.uid()
      )
  ) t;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================
-- 적용 확인용 점검 쿼리 (선택 실행)
-- ============================================================
-- SELECT verify_admin_password('0303');                       -- TRUE 여야 함
-- SELECT change_admin_password('0303', '새비밀번호');         -- 운영 비밀번호로 즉시 변경 권장!
-- SELECT verify_admin_password('새비밀번호');                  -- TRUE
-- SELECT * FROM get_tours_with_details();                     -- 본인 투어 일괄
