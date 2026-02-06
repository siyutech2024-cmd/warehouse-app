-- 仓库管理系统 - Supabase 数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('ADMIN', 'EMPLOYEE')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  barcode TEXT UNIQUE NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  discount_price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_by TEXT NOT NULL,
  created_by_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认管理员
INSERT INTO users (username, role, status) 
VALUES ('admin', 'ADMIN', 'active')
ON CONFLICT (username) DO NOTHING;

-- 插入默认设置
INSERT INTO settings (key, value) 
VALUES ('app_settings', '{"discountRate": 30, "requireAudit": false, "lowStockThreshold": 10, "categories": ["电子产品", "办公用品", "生活用品", "其他"]}')
ON CONFLICT (key) DO NOTHING;

-- 启用 RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有认证用户读取
CREATE POLICY "Allow read for all" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read for all" ON products FOR SELECT USING (true);
CREATE POLICY "Allow read for all" ON settings FOR SELECT USING (true);

-- 创建策略：允许所有认证用户插入/更新
CREATE POLICY "Allow insert for all" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow insert for all" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all" ON products FOR DELETE USING (true);

CREATE POLICY "Allow insert for all" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON settings FOR UPDATE USING (true);
