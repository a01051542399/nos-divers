-- ============================================================
-- NoS Divers — Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1-1. profiles (auth.users와 1:1)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  grade TEXT DEFAULT '멤버',
  phone TEXT,
  birth_date TEXT,
  diving_level TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1-2. tours
CREATE TABLE tours (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  location TEXT DEFAULT '',
  invite_code TEXT UNIQUE NOT NULL,
  access_code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 1-3. tour_members (접근 제어 핵심)
CREATE TABLE tour_members (
  tour_id INT REFERENCES tours(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',  -- 'owner' | 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tour_id, user_id)
);

-- 1-4. participants (비회원도 포함 가능)
CREATE TABLE participants (
  id SERIAL PRIMARY KEY,
  tour_id INT REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  added_by TEXT,
  last_modified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1-5. expenses
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  tour_id INT REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KRW',
  exchange_rate NUMERIC DEFAULT 1,
  paid_by INT REFERENCES participants(id) ON DELETE SET NULL,
  split_among INT[] NOT NULL DEFAULT '{}',
  split_type TEXT DEFAULT 'equal',
  split_amounts JSONB,
  receipt_url TEXT,
  last_modified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1-6. waivers
CREATE TABLE waivers (
  id SERIAL PRIMARY KEY,
  tour_id INT REFERENCES tours(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  personal_info JSONB NOT NULL,
  health_checklist JSONB NOT NULL,
  health_other TEXT,
  signature_url TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  agreed BOOLEAN DEFAULT true
);

-- 1-7. comments
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  tour_id INT REFERENCES tours(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN DEFAULT false
);

-- 1-8. app_settings (사용자별 설정)
CREATE TABLE app_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_password TEXT,
  hidden_tour_ids INT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 2. TRIGGERS
-- ============================================================

-- 신규 사용자 → profiles 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- tours.updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tours_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 헬퍼: 투어 멤버 확인
CREATE OR REPLACE FUNCTION is_tour_member(_tour_id INT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tour_members
    WHERE tour_id = _tour_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- tours
CREATE POLICY "tours_select" ON tours FOR SELECT USING (is_tour_member(id));
CREATE POLICY "tours_insert" ON tours FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tours_update" ON tours FOR UPDATE USING (is_tour_member(id));
CREATE POLICY "tours_delete" ON tours FOR DELETE USING (created_by = auth.uid());

-- tour_members
CREATE POLICY "members_select" ON tour_members FOR SELECT USING (is_tour_member(tour_id));
CREATE POLICY "members_insert" ON tour_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete" ON tour_members FOR DELETE USING (user_id = auth.uid());

-- participants
CREATE POLICY "participants_select" ON participants FOR SELECT USING (is_tour_member(tour_id));
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (is_tour_member(tour_id));
CREATE POLICY "participants_update" ON participants FOR UPDATE USING (is_tour_member(tour_id));
CREATE POLICY "participants_delete" ON participants FOR DELETE USING (is_tour_member(tour_id));

-- expenses
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (is_tour_member(tour_id));
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (is_tour_member(tour_id));
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (is_tour_member(tour_id));
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (is_tour_member(tour_id));

-- waivers
CREATE POLICY "waivers_select" ON waivers FOR SELECT USING (is_tour_member(tour_id));
CREATE POLICY "waivers_insert" ON waivers FOR INSERT WITH CHECK (is_tour_member(tour_id));
CREATE POLICY "waivers_update" ON waivers FOR UPDATE USING (is_tour_member(tour_id));
CREATE POLICY "waivers_delete" ON waivers FOR DELETE USING (is_tour_member(tour_id));

-- comments
CREATE POLICY "comments_select" ON comments FOR SELECT USING (is_tour_member(tour_id));
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (is_tour_member(tour_id));
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (is_tour_member(tour_id));
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (is_tour_member(tour_id));

-- app_settings
CREATE POLICY "settings_select" ON app_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "settings_insert" ON app_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "settings_update" ON app_settings FOR UPDATE USING (user_id = auth.uid());


-- ============================================================
-- 4. RPC FUNCTIONS (RLS 우회가 필요한 작업)
-- ============================================================

-- 초대 코드로 투어 조회 (가입 전이므로 RLS 우회)
CREATE OR REPLACE FUNCTION lookup_tour_by_invite(p_code TEXT)
RETURNS TABLE(id INT, name TEXT, date TEXT, location TEXT, created_by_name TEXT)
AS $$
  SELECT t.id, t.name, t.date, t.location, t.created_by_name
  FROM tours t
  WHERE t.invite_code = p_code AND t.deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- 투어 참여 (멤버 등록 + 참여자 추가를 원자적으로)
CREATE OR REPLACE FUNCTION join_tour(
  p_invite_code TEXT,
  p_user_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tour tours%ROWTYPE;
  v_participant_id INT;
BEGIN
  SELECT * INTO v_tour FROM tours
  WHERE invite_code = p_invite_code AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', '유효하지 않은 초대 코드입니다');
  END IF;

  -- 이미 멤버인지 확인
  IF EXISTS (
    SELECT 1 FROM tour_members
    WHERE tour_id = v_tour.id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', '이미 참여 중인 투어입니다');
  END IF;

  -- 멤버 등록
  INSERT INTO tour_members (tour_id, user_id, role)
  VALUES (v_tour.id, auth.uid(), 'member');

  -- 참여자 추가
  INSERT INTO participants (tour_id, name, user_id, added_by)
  VALUES (v_tour.id, p_user_name, auth.uid(), p_user_name)
  RETURNING id INTO v_participant_id;

  RETURN jsonb_build_object(
    'tourId', v_tour.id,
    'participantId', v_participant_id,
    'tourName', v_tour.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 유니크 초대 코드 생성
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM tours WHERE invite_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 투어 생성 (RLS 우회: tours + tour_members + participants 원자적 처리)
CREATE OR REPLACE FUNCTION create_tour_rpc(
  p_name TEXT,
  p_date TEXT,
  p_location TEXT,
  p_access_code TEXT,
  p_created_by_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_invite_code TEXT;
  v_tour_id INT;
  v_participant_id INT;
BEGIN
  -- 유니크 초대 코드 생성
  LOOP
    v_invite_code := upper(substr(md5(random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM tours WHERE invite_code = v_invite_code);
  END LOOP;

  -- 투어 생성
  INSERT INTO tours (name, date, location, invite_code, access_code, created_by, created_by_name)
  VALUES (p_name, p_date, p_location, v_invite_code, p_access_code, auth.uid(), p_created_by_name)
  RETURNING id INTO v_tour_id;

  -- 생성자를 멤버(owner)로 등록
  INSERT INTO tour_members (tour_id, user_id, role)
  VALUES (v_tour_id, auth.uid(), 'owner');

  -- 생성자를 첫 참여자로 추가
  INSERT INTO participants (tour_id, name, user_id, added_by)
  VALUES (v_tour_id, p_created_by_name, auth.uid(), p_created_by_name)
  RETURNING id INTO v_participant_id;

  RETURN jsonb_build_object(
    'tourId', v_tour_id,
    'inviteCode', v_invite_code,
    'participantId', v_participant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 관리자 비밀번호 확인 (전역 설정)
CREATE OR REPLACE FUNCTION verify_admin_password(p_password TEXT)
RETURNS BOOLEAN AS $$
  SELECT p_password = '0303';
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- 5. STORAGE BUCKET
-- ============================================================

-- images 버킷 (비공개)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: 로그인 사용자만 업로드/조회
CREATE POLICY "images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);


-- ============================================================
-- 6. INDEXES (성능 최적화)
-- ============================================================

CREATE INDEX idx_tour_members_user ON tour_members(user_id);
CREATE INDEX idx_tour_members_tour ON tour_members(tour_id);
CREATE INDEX idx_participants_tour ON participants(tour_id);
CREATE INDEX idx_expenses_tour ON expenses(tour_id);
CREATE INDEX idx_waivers_tour ON waivers(tour_id);
CREATE INDEX idx_comments_tour ON comments(tour_id);
CREATE INDEX idx_tours_invite_code ON tours(invite_code);
CREATE INDEX idx_tours_deleted_at ON tours(deleted_at) WHERE deleted_at IS NOT NULL;
