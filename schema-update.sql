-- Add budget field to shopping_lists table
ALTER TABLE shopping_lists ADD COLUMN budget DECIMAL(10, 2) DEFAULT NULL;

-- Add price field to shopping_items table
ALTER TABLE shopping_items ADD COLUMN price DECIMAL(10, 2) DEFAULT NULL;
