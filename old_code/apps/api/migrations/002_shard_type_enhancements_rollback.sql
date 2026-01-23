-- Rollback for ShardType Schema Updates Migration
-- Reverts changes made in 002_shard_type_enhancements.sql

-- Drop views
DROP VIEW IF EXISTS global_shard_types;
DROP VIEW IF EXISTS active_shard_types;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_increment_version ON shard_types;
DROP TRIGGER IF EXISTS trigger_check_circular_inheritance ON shard_types;

-- Drop functions
DROP FUNCTION IF EXISTS increment_shard_type_version();
DROP FUNCTION IF EXISTS check_circular_inheritance();

-- Drop indexes
DROP INDEX IF EXISTS idx_shard_types_tags;
DROP INDEX IF EXISTS idx_shard_types_tenant_id;
DROP INDEX IF EXISTS idx_shard_types_parent_id;
DROP INDEX IF EXISTS idx_shard_types_status;
DROP INDEX IF EXISTS idx_shard_types_category;
DROP INDEX IF EXISTS idx_shard_types_is_global;

-- Drop constraints
ALTER TABLE shard_types DROP CONSTRAINT IF EXISTS chk_global_tenant;
ALTER TABLE shard_types DROP CONSTRAINT IF EXISTS chk_color_format;

-- Remove columns (careful: this will lose data!)
ALTER TABLE shard_types
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS is_system,
DROP COLUMN IF EXISTS version,
DROP COLUMN IF EXISTS parent_shard_type_id,
DROP COLUMN IF EXISTS ui_schema,
DROP COLUMN IF EXISTS is_global,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS display_name;

-- Rollback complete
SELECT 'ShardType migration rollback completed' AS status;
