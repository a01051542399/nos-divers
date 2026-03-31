-- ============================================================
-- NoS Divers — Push Notifications Migration
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

-- device_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- RLS 설정
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_tokens_select" ON device_tokens FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "device_tokens_insert" ON device_tokens FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "device_tokens_update" ON device_tokens FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "device_tokens_delete" ON device_tokens FOR DELETE USING (user_id = auth.uid());

-- 비용 추가 시 알림을 위한 함수 (Supabase Database Webhook으로 호출)
-- Edge Function에서 처리하므로 여기서는 테이블만 생성
