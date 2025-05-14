-- Create tables for CartPal application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (simplified auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Shopping Lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Shopping Items
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  quantity TEXT DEFAULT '1',
  checked BOOLEAN DEFAULT FALSE,
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image TEXT,
  instructions TEXT NOT NULL,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Recipe Ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Meal Plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  note TEXT NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date, meal_type)
);

-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public) VALUES ('cartpal-images', 'cartpal-images', true)
ON CONFLICT DO NOTHING;

-- Set up storage policy to allow authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Allow authenticated users to upload images'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'cartpal-images');
  END IF;
END
$$;

-- Set up storage policy to allow public access to images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Allow public access to images'
  ) THEN
    CREATE POLICY "Allow public access to images"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'cartpal-images');
  END IF;
END
$$;

-- Set up RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Shopping Lists policies
CREATE POLICY "Users can view their own shopping lists"
  ON shopping_lists
  FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can create their own shopping lists"
  ON shopping_lists
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can update their own shopping lists"
  ON shopping_lists
  FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can delete their own shopping lists"
  ON shopping_lists
  FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

-- Shopping Items policies
CREATE POLICY "Users can view items in their shopping lists"
  ON shopping_items
  FOR SELECT
  USING (list_id IN (SELECT id FROM shopping_lists WHERE user_id IN (SELECT id FROM profiles)));

CREATE POLICY "Users can create items in their shopping lists"
  ON shopping_items
  FOR INSERT
  WITH CHECK (list_id IN (SELECT id FROM shopping_lists WHERE user_id IN (SELECT id FROM profiles)));

CREATE POLICY "Users can update items in their shopping lists"
  ON shopping_items
  FOR UPDATE
  USING (list_id IN (SELECT id FROM shopping_lists WHERE user_id IN (SELECT id FROM profiles)));

CREATE POLICY "Users can delete items in their shopping lists"
  ON shopping_items
  FOR DELETE
  USING (list_id IN (SELECT id FROM shopping_lists WHERE user_id IN (SELECT id FROM profiles)));

-- Recipes policies
CREATE POLICY "Users can view their own recipes"
  ON recipes
  FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can create their own recipes"
  ON recipes
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can update their own recipes"
  ON recipes
  FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can delete their own recipes"
  ON recipes
  FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

-- Recipe Ingredients policies
CREATE POLICY "Users can view ingredients for their recipes"
  ON recipe_ingredients
  FOR SELECT
  USING (recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM profiles)));

CREATE POLICY "Users can create ingredients for their recipes"
  ON recipe_ingredients
  FOR INSERT
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM profiles)));

CREATE POLICY "Users can update ingredients for their recipes"
  ON recipe_ingredients
  FOR UPDATE
  USING (recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM profiles)));

CREATE POLICY "Users can delete ingredients for their recipes"
  ON recipe_ingredients
  FOR DELETE
  USING (recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM profiles)));

-- Meal Plans policies
CREATE POLICY "Users can view their own meal plans"
  ON meal_plans
  FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can create their own meal plans"
  ON meal_plans
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can update their own meal plans"
  ON meal_plans
  FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));

CREATE POLICY "Users can delete their own meal plans"
  ON meal_plans
  FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE id = user_id));
