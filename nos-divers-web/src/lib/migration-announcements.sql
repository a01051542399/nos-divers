-- ============================================================
-- Dive ON — 인앱 공지 시스템 마이그레이션 (재실행 안전)
-- Supabase Dashboard → SQL Editor 실행
-- ============================================================
--
-- 설계:
--   announcements          : 운영진이 게시한 공지 본문
--   announcement_reads     : (announcement_id, user_id) 읽음 표시
--
-- 권한:
--   조회 — target_tour_id IS NULL (전체) 또는 사용자가 멤버인 투어
--   작성/삭제 — 관리자 비밀번호 검증된 RPC 만 (verify_admin_password)
--   읽음 표시 — 본인만
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_tour_id INT REFERENCES tours(id) ON DELETE CASCADE, -- NULL = 전체 공지
  pinned BOOLEAN NOT NULL DEFAULT FALSE,                     -- 상단 고정
  author_name TEXT NOT NULL DEFAULT '운영진',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_target_tour
  ON announcements(target_tour_id);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id INT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
  ON announcement_reads(user_id);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 조회: 전체 공지 OR 사용자가 멤버인 투어 공지
DROP POLICY IF EXISTS "announcements_select" ON announcements;
CREATE POLICY "announcements_select" ON announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      target_tour_id IS NULL
      OR EXISTS (
        SELECT 1 FROM tour_members
        WHERE tour_id = announcements.target_tour_id AND user_id = auth.uid()
      )
    )
  );

-- INSERT/UPDATE/DELETE 는 RPC(SECURITY DEFINER + 관리자 검증) 만 허용
-- → 일반 사용자는 정책이 없으므로 차단

-- 읽음 표시: 본인 행만
DROP POLICY IF EXISTS "announcement_reads_select" ON announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_insert" ON announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_delete" ON announcement_reads;

CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "announcement_reads_delete" ON announcement_reads FOR DELETE
  USING (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- RPC: 관리자 비밀번호 검증 후 공지 생성
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_announcement(
  p_admin_password TEXT,
  p_title TEXT,
  p_body TEXT,
  p_target_tour_id INT DEFAULT NULL,
  p_pinned BOOLEAN DEFAULT FALSE,
  p_author_name TEXT DEFAULT '운영진'
) RETURNS JSONB AS $$
DECLARE
  v_id INT;
BEGIN
  IF NOT verify_admin_password(p_admin_password) THEN
    RETURN jsonb_build_object('error', '관리자 비밀번호가 올바르지 않습니다');
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object('error', '제목을 입력하세요');
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RETURN jsonb_build_object('error', '본문을 입력하세요');
  END IF;

  INSERT INTO announcements (title, body, target_tour_id, pinned, author_name)
  VALUES (trim(p_title), trim(p_body), p_target_tour_id, COALESCE(p_pinned, FALSE),
          COALESCE(NULLIF(trim(p_author_name), ''), '운영진'))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- RPC: 관리자 검증 후 공지 수정
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_announcement(
  p_admin_password TEXT,
  p_id INT,
  p_title TEXT,
  p_body TEXT,
  p_pinned BOOLEAN DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  IF NOT verify_admin_password(p_admin_password) THEN
    RETURN jsonb_build_object('error', '관리자 비밀번호가 올바르지 않습니다');
  END IF;

  UPDATE announcements
     SET title  = COALESCE(NULLIF(trim(p_title), ''), title),
         body   = COALESCE(NULLIF(trim(p_body), ''), body),
         pinned = COALESCE(p_pinned, pinned)
   WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', '공지를 찾을 수 없습니다');
  END IF;
  RETURN jsonb_build_object('ok', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- RPC: 관리자 검증 후 공지 삭제
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_announcement(
  p_admin_password TEXT,
  p_id INT
) RETURNS JSONB AS $$
BEGIN
  IF NOT verify_admin_password(p_admin_password) THEN
    RETURN jsonb_build_object('error', '관리자 비밀번호가 올바르지 않습니다');
  END IF;
  DELETE FROM announcements WHERE id = p_id;
  RETURN jsonb_build_object('ok', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- RPC: 미읽음 공지 개수 (배지용)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_announcement_count()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM announcements a
  WHERE
    (a.target_tour_id IS NULL OR EXISTS (
      SELECT 1 FROM tour_members
      WHERE tour_id = a.target_tour_id AND user_id = auth.uid()
    ))
    AND NOT EXISTS (
      SELECT 1 FROM announcement_reads r
      WHERE r.announcement_id = a.id AND r.user_id = auth.uid()
    );

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────
-- RPC: 모든 공지 한 번에 읽음 처리
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_all_announcements_read()
RETURNS INT AS $$
DECLARE
  v_n INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  WITH inserted AS (
    INSERT INTO announcement_reads (announcement_id, user_id)
    SELECT a.id, auth.uid()
    FROM announcements a
    WHERE
      (a.target_tour_id IS NULL OR EXISTS (
        SELECT 1 FROM tour_members
        WHERE tour_id = a.target_tour_id AND user_id = auth.uid()
      ))
    ON CONFLICT (announcement_id, user_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_n FROM inserted;
  RETURN COALESCE(v_n, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 점검 쿼리 (선택 실행)
-- ============================================================
-- SELECT create_announcement('950506', '시스템 점검 안내', '내일 23시 ~ 24시 점검 예정입니다');
-- SELECT * FROM announcements ORDER BY created_at DESC;
-- SELECT get_unread_announcement_count();
-- SELECT mark_all_announcements_read();
