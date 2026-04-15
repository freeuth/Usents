-- ============================================================
-- RLS 정책 전체 재설정
-- ============================================================

-- HOUSEHOLDS
DROP POLICY IF EXISTS "household_member_select" ON households;
DROP POLICY IF EXISTS "household_member_update" ON households;
DROP POLICY IF EXISTS "household_insert" ON households;
DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "households_insert" ON households;
DROP POLICY IF EXISTS "households_update" ON households;

-- get_my_household_id() 는 SECURITY DEFINER 이므로 재귀 없음
CREATE POLICY "households_select" ON households FOR SELECT TO authenticated
  USING (id = get_my_household_id());

CREATE POLICY "households_insert" ON households FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "households_update" ON households FOR UPDATE TO authenticated
  USING (id = get_my_household_id());

-- MEMBERS
DROP POLICY IF EXISTS "members_select" ON members;
DROP POLICY IF EXISTS "members_insert" ON members;
DROP POLICY IF EXISTS "members_update" ON members;

-- 인라인 서브쿼리 사용 시 members 테이블 RLS 재진입 → 무한 재귀 발생
-- get_my_household_id() (SECURITY DEFINER) 로 교체하면 재귀 없음
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated
  USING (household_id = get_my_household_id());

CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ACCOUNTS
DROP POLICY IF EXISTS "accounts_all" ON accounts;
CREATE POLICY "accounts_all" ON accounts FOR ALL TO authenticated
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- CARDS
DROP POLICY IF EXISTS "cards_all" ON cards;
CREATE POLICY "cards_all" ON cards FOR ALL TO authenticated
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- CATEGORIES
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_modify" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated
  USING (household_id IS NULL OR household_id = get_my_household_id());
CREATE POLICY "categories_modify" ON categories FOR ALL TO authenticated
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- TRANSACTIONS
DROP POLICY IF EXISTS "transactions_all" ON transactions;
CREATE POLICY "transactions_all" ON transactions FOR ALL TO authenticated
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- RECURRING
DROP POLICY IF EXISTS "recurring_all" ON recurring_transactions;
CREATE POLICY "recurring_all" ON recurring_transactions FOR ALL TO authenticated
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- SNAPSHOTS
DROP POLICY IF EXISTS "snapshots_all" ON monthly_snapshots;
CREATE POLICY "snapshots_all" ON monthly_snapshots FOR ALL TO authenticated
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- ============================================================
-- RPC: 가구 생성 (SECURITY DEFINER)
-- ============================================================

DROP FUNCTION IF EXISTS create_household_with_member(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_household_with_member(text,text,text,owner_type,text);
CREATE FUNCTION create_household_with_member(
  p_household_name TEXT,
  p_invite_code    TEXT,
  p_display_name   TEXT,
  p_role           TEXT,
  p_color          TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- 이미 가구에 속해 있으면 기존 household_id 반환
  SELECT household_id INTO v_household_id
  FROM members WHERE user_id = auth.uid() LIMIT 1;

  IF v_household_id IS NOT NULL THEN
    RETURN v_household_id;
  END IF;

  INSERT INTO households (name, invite_code)
  VALUES (p_household_name, p_invite_code)
  RETURNING id INTO v_household_id;

  INSERT INTO members (household_id, user_id, role, display_name, color)
  VALUES (v_household_id, auth.uid(), p_role::owner_type, p_display_name, p_color);

  RETURN v_household_id;
END;
$$;

-- ============================================================
-- RPC: 초대코드로 가구 참여 (SECURITY DEFINER)
-- ============================================================

DROP FUNCTION IF EXISTS join_household_with_code(text,text,text);
CREATE FUNCTION join_household_with_code(
  p_invite_code  TEXT,
  p_display_name TEXT,
  p_color        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  SELECT id INTO v_household_id
  FROM households WHERE invite_code = p_invite_code;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION '유효하지 않은 초대 코드입니다';
  END IF;

  -- 이미 이 가구 멤버라면 그냥 반환
  IF EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND household_id = v_household_id) THEN
    RETURN v_household_id;
  END IF;

  -- 다른 가구 멤버라면 오류
  IF EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION '이미 다른 가구에 속해 있습니다';
  END IF;

  INSERT INTO members (household_id, user_id, role, display_name, color)
  VALUES (v_household_id, auth.uid(), 'spouse', p_display_name, p_color);

  RETURN v_household_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
