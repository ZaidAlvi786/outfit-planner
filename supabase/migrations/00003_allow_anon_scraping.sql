-- Allow anyone to read categories, subcategories, brands and products
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public select on categories" ON categories;
DROP POLICY IF EXISTS "Allow public select on subcategories" ON subcategories;
DROP POLICY IF EXISTS "Allow public select on brands" ON brands;
DROP POLICY IF EXISTS "Allow public select on products" ON products;

DROP POLICY IF EXISTS "Allow anon insert on categories" ON categories;
DROP POLICY IF EXISTS "Allow anon insert on subcategories" ON subcategories;
DROP POLICY IF EXISTS "Allow anon insert on brands" ON brands;
DROP POLICY IF EXISTS "Allow anon insert on products" ON products;

DROP POLICY IF EXISTS "Allow anon update on categories" ON categories;
DROP POLICY IF EXISTS "Allow anon update on subcategories" ON subcategories;
DROP POLICY IF EXISTS "Allow anon update on brands" ON brands;

-- Select policies
CREATE POLICY "Allow public select on categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public select on subcategories" ON subcategories FOR SELECT USING (true);
CREATE POLICY "Allow public select on brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Allow public select on products" ON products FOR SELECT USING (true);

-- Insert policies
CREATE POLICY "Allow anon insert on categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert on subcategories" ON subcategories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert on brands" ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert on products" ON products FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Allow anon update on categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Allow anon update on subcategories" ON subcategories FOR UPDATE USING (true);
CREATE POLICY "Allow anon update on brands" ON brands FOR UPDATE USING (true);
