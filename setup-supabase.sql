-- lessonsテーブルの作成
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  pdfUrl TEXT,
  systemPrompt TEXT,
  level TEXT,
  tags TEXT[],
  createdAt BIGINT,
  updatedAt BIGINT,
  audioGenerated BOOLEAN DEFAULT FALSE,
  headerTitle TEXT,
  startButtonText TEXT,
  keyPhrase JSONB,
  dialogueTurns JSONB[],
  goals JSONB[]
);

-- lessonsテーブルのRLSを有効にする
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーに読み取り権限を付与
CREATE POLICY IF NOT EXISTS "誰でも閲覧可能" ON public.lessons
    FOR SELECT USING (true);

-- 匿名ユーザーに挿入権限を付与
CREATE POLICY IF NOT EXISTS "誰でも追加可能" ON public.lessons
    FOR INSERT WITH CHECK (true);

-- 匿名ユーザーに更新権限を付与
CREATE POLICY IF NOT EXISTS "誰でも更新可能" ON public.lessons
    FOR UPDATE USING (true);

-- 匿名ユーザーに削除権限を付与
CREATE POLICY IF NOT EXISTS "誰でも削除可能" ON public.lessons
    FOR DELETE USING (true); 