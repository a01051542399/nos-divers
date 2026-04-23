-- ============================================================
-- Dive ON — 관리자 모드 (단일 비밀번호로 전체 관리)
-- Supabase SQL Editor 실행. 재실행 안전.
-- ============================================================
--
-- 컨셉:
--   관리자 비밀번호(950506) 검증에 성공한 사용자는 admin_users 에 등록되며,
--   이 후 모든 RLS 가 통과되어 모든 투어/참여자/비용/동의서/댓글을 보고 관리할 수 있다.
--   "관리자 모드 종료" 시 admin_users 에서 자신을 제거.
--
-- 보안:
--   - admin_users 직접 INSERT/DELETE 차단 (정책 없음 + RLS ON)
--   - RPC SECURITY DEFINER 로만 진입/탈출
--   - 관리자 진입은 비밀번호 + auth.uid() 필요 (anon 차단)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- 정책 없음 → SECURITY DEFINER RPC 외에는 접근 불가

-- ────────────────────────────────────────────────────────────
-- 관리자 여부 확인 (RLS 정책에서 사용)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────
-- 관리자 권한 획득 (비밀번호 검증)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_admin_access(p_admin_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  IF NOT verify_admin_password(p_admin_password) THEN
    RETURN FALSE;
  END IF;
  INSERT INTO admin_users (user_id) VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 관리자 권한 반납 (관리자 모드 종료)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION release_admin_access()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  DELETE FROM admin_users WHERE user_id = auth.uid();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 클라이언트가 자신의 admin 상태를 묻는 RPC
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION am_i_admin()
RETURNS BOOLEAN AS $$
  SELECT is_app_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS 정책 갱신: is_tour_member OR is_app_admin
-- ============================================================
-- 기존 정책을 drop 후 재생성 (조건만 OR is_app_admin() 추가)

-- tours
DROP POLICY IF EXISTS "tours_select" ON tours;
DROP POLICY IF EXISTS "tours_update" ON tours;
DROP POLICY IF EXISTS "tours_delete" ON tours;
CREATE POLICY "tours_select" ON tours FOR SELECT
  USING (is_tour_member(id) OR is_app_admin());
CREATE POLICY "tours_update" ON tours FOR UPDATE
  USING (is_tour_member(id) OR is_app_admin());
CREATE POLICY "tours_delete" ON tours FOR DELETE
  USING (created_by = auth.uid() OR is_app_admin());

-- participants
DROP POLICY IF EXISTS "participants_select" ON participants;
DROP POLICY IF EXISTS "participants_insert" ON participants;
DROP POLICY IF EXISTS "participants_update" ON participants;
DROP POLICY IF EXISTS "participants_delete" ON participants;
CREATE POLICY "participants_select" ON participants FOR SELECT
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "participants_insert" ON participants FOR INSERT
  WITH CHECK (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "participants_update" ON participants FOR UPDATE
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "participants_delete" ON participants FOR DELETE
  USING (is_tour_member(tour_id) OR is_app_admin());

-- expenses
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "expenses_update" ON expenses FOR UPDATE
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "expenses_delete" ON expenses FOR DELETE
  USING (is_tour_member(tour_id) OR is_app_admin());

-- waivers
DROP POLICY IF EXISTS "waivers_select" ON waivers;
DROP POLICY IF EXISTS "waivers_insert" ON waivers;
DROP POLICY IF EXISTS "waivers_update" ON waivers;
DROP POLICY IF EXISTS "waivers_delete" ON waivers;
CREATE POLICY "waivers_select" ON waivers FOR SELECT
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "waivers_insert" ON waivers FOR INSERT
  WITH CHECK (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "waivers_update" ON waivers FOR UPDATE
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "waivers_delete" ON waivers FOR DELETE
  USING (is_tour_member(tour_id) OR is_app_admin());

-- comments
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_update" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (is_tour_member(tour_id) OR is_app_admin());
CREATE POLICY "comments_delete" ON comments FOR DELETE
  USING (is_tour_member(tour_id) OR is_app_admin());

-- profiles: 관리자는 모든 프로필 조회 가능 (수정은 본인만)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_app_admin());

-- announcements: 관리자는 모두 조회 가능 (이미 RLS 통과 보장)
-- (작성/삭제는 RPC 가 verify_admin_password 하므로 정책 변경 불필요)

-- ============================================================
-- get_tours_with_details : 관리자면 모든 투어 반환
-- ============================================================
CREATE OR REPLACE FUNCTION get_tours_with_details(p_include_deleted BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := is_app_admin();

  SELECT COALESCE(jsonb_agg(t.tour_data ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT
      tours.created_at,
      jsonb_build_object(
        'tour', to_jsonb(tours),
        'participants', COALESCE(
          (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id)
             FROM participants p WHERE p.tour_id = tours.id),
          '[]'::jsonb),
        'expenses', COALESCE(
          (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id)
             FROM expenses e WHERE e.tour_id = tours.id),
          '[]'::jsonb)
      ) AS tour_data
    FROM tours
    WHERE
      (p_include_deleted OR tours.deleted_at IS NULL)
      AND (NOT p_include_deleted OR tours.deleted_at IS NOT NULL)
      AND (
        v_is_admin
        OR EXISTS (
          SELECT 1 FROM tour_members
          WHERE tour_id = tours.id AND user_id = auth.uid()
        )
      )
  ) t;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 점검
-- ============================================================
-- SELECT claim_admin_access('950506');   -- TRUE
-- SELECT am_i_admin();                    -- TRUE
-- SELECT release_admin_access();          -- TRUE
-- SELECT am_i_admin();                    -- FALSE
