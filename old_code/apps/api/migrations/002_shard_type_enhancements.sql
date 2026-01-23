-- ShardType Schema Updates Migration
-- Adds new fields to shard_types table to support enhanced functionality

-- Add new columns to shard_types table
ALTER TABLE shard_types
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(7),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS ui_schema JSONB,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_shard_type_id UUID REFERENCES shard_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shard_types_is_global ON shard_types(is_global);
CREATE INDEX IF NOT EXISTS idx_shard_types_category ON shard_types(category);
CREATE INDEX IF NOT EXISTS idx_shard_types_status ON shard_types(status);
CREATE INDEX IF NOT EXISTS idx_shard_types_parent_id ON shard_types(parent_shard_type_id);
CREATE INDEX IF NOT EXISTS idx_shard_types_tenant_id ON shard_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shard_types_tags ON shard_types USING GIN(tags);

-- Add check constraint for color format (hex color)
ALTER TABLE shard_types
ADD CONSTRAINT chk_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Add check constraint for global types (must have tenant_id = 'system')
ALTER TABLE shard_types
ADD CONSTRAINT chk_global_tenant CHECK (
  (is_global = TRUE AND tenant_id = 'system') OR
  (is_global = FALSE AND tenant_id != 'system')
);

-- Backfill display_name from name for existing records
UPDATE shard_types
SET display_name = INITCAP(REPLACE(name, '-', ' '))
WHERE display_name IS NULL;

-- Make display_name required going forward
ALTER TABLE shard_types
ALTER COLUMN display_name SET NOT NULL;

-- Update version for all existing records
UPDATE shard_types
SET version = 1
WHERE version IS NULL;

-- Create function to check circular inheritance
CREATE OR REPLACE FUNCTION check_circular_inheritance()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  visited_ids UUID[];
BEGIN
  -- If no parent, no circular reference possible
  IF NEW.parent_shard_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Start with the parent
  current_id := NEW.parent_shard_type_id;
  visited_ids := ARRAY[NEW.id];
  
  -- Traverse up the inheritance chain
  WHILE current_id IS NOT NULL LOOP
    -- Check if we've seen this ID before (circular reference)
    IF current_id = ANY(visited_ids) THEN
      RAISE EXCEPTION 'Circular inheritance detected for shard_type_id %', NEW.id;
    END IF;
    
    -- Add current ID to visited
    visited_ids := array_append(visited_ids, current_id);
    
    -- Get the next parent
    SELECT parent_shard_type_id INTO current_id
    FROM shard_types
    WHERE id = current_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular inheritance
DROP TRIGGER IF EXISTS trigger_check_circular_inheritance ON shard_types;
CREATE TRIGGER trigger_check_circular_inheritance
  BEFORE INSERT OR UPDATE OF parent_shard_type_id
  ON shard_types
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_inheritance();

-- Create function to increment version on update
CREATE OR REPLACE FUNCTION increment_shard_type_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment version if schema or ui_schema changed
  IF OLD.schema IS DISTINCT FROM NEW.schema OR
     OLD.ui_schema IS DISTINCT FROM NEW.ui_schema THEN
    NEW.version := OLD.version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version
DROP TRIGGER IF EXISTS trigger_increment_version ON shard_types;
CREATE TRIGGER trigger_increment_version
  BEFORE UPDATE ON shard_types
  FOR EACH ROW
  EXECUTE FUNCTION increment_shard_type_version();

-- Create view for active shard types
CREATE OR REPLACE VIEW active_shard_types AS
SELECT *
FROM shard_types
WHERE status = 'active' AND is_active = TRUE;

-- Create view for global shard types
CREATE OR REPLACE VIEW global_shard_types AS
SELECT *
FROM shard_types
WHERE is_global = TRUE AND tenant_id = 'system';

-- Grant permissions
GRANT SELECT ON active_shard_types TO authenticated;
GRANT SELECT ON global_shard_types TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN shard_types.display_name IS 'Human-readable name shown in UI';
COMMENT ON COLUMN shard_types.icon IS 'Lucide icon name for visual representation';
COMMENT ON COLUMN shard_types.color IS 'Hex color (#RRGGBB) for badges and UI elements';
COMMENT ON COLUMN shard_types.tags IS 'Array of tags for categorization and search';
COMMENT ON COLUMN shard_types.ui_schema IS 'UI customization schema for form rendering';
COMMENT ON COLUMN shard_types.is_global IS 'Whether this is a system-wide type (tenant_id must be "system")';
COMMENT ON COLUMN shard_types.parent_shard_type_id IS 'Parent type for inheritance';
COMMENT ON COLUMN shard_types.version IS 'Schema version, incremented on schema changes';
COMMENT ON COLUMN shard_types.is_system IS 'Built-in system type that cannot be deleted';
COMMENT ON COLUMN shard_types.is_active IS 'Whether this type is currently active';

-- Migration complete
SELECT 'ShardType migration completed successfully' AS status;
