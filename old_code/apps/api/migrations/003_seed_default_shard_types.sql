-- Seed Default Global ShardTypes
-- Creates initial system-wide ShardTypes for common use cases

-- Insert default global shard types
-- tenant_id = 'system' for global types

INSERT INTO shard_types (
  id,
  name,
  display_name,
  description,
  category,
  schema,
  ui_schema,
  icon,
  color,
  tags,
  is_global,
  is_system,
  is_active,
  version,
  status,
  tenant_id,
  created_at,
  updated_at
) VALUES

-- 1. Generic Document
(
  gen_random_uuid(),
  'generic-document',
  'Generic Document',
  'A flexible document type for text-based content with title, body, and metadata',
  'DOCUMENT',
  '{
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "Document title"
      },
      "content": {
        "type": "string",
        "minLength": 1,
        "description": "Main document content"
      },
      "author": {
        "type": "string",
        "description": "Document author"
      },
      "publishDate": {
        "type": "string",
        "format": "date",
        "description": "Publication date"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Document tags"
      },
      "status": {
        "type": "string",
        "enum": ["draft", "published", "archived"],
        "default": "draft"
      }
    },
    "required": ["title", "content"]
  }'::jsonb,
  '{
    "title": {
      "ui:widget": "text",
      "ui:placeholder": "Enter document title"
    },
    "content": {
      "ui:widget": "textarea",
      "ui:options": {
        "rows": 10
      }
    },
    "publishDate": {
      "ui:widget": "date"
    },
    "status": {
      "ui:widget": "select"
    }
  }'::jsonb,
  'FileText',
  '#3b82f6',
  ARRAY['document', 'default', 'content'],
  TRUE,
  TRUE,
  TRUE,
  1,
  'active',
  'system',
  NOW(),
  NOW()
),

-- 2. Contact/Person Record
(
  gen_random_uuid(),
  'contact-record',
  'Contact Record',
  'Standard contact information for people including personal and professional details',
  'DATA',
  '{
    "type": "object",
    "properties": {
      "firstName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "lastName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "email": {
        "type": "string",
        "format": "email"
      },
      "phone": {
        "type": "string",
        "pattern": "^[+]?[0-9]{10,15}$"
      },
      "company": {
        "type": "string"
      },
      "jobTitle": {
        "type": "string"
      },
      "address": {
        "type": "object",
        "properties": {
          "street": { "type": "string" },
          "city": { "type": "string" },
          "state": { "type": "string" },
          "zipCode": { "type": "string" },
          "country": { "type": "string" }
        }
      },
      "notes": {
        "type": "string"
      }
    },
    "required": ["firstName", "lastName", "email"]
  }'::jsonb,
  '{
    "email": {
      "ui:widget": "email",
      "ui:placeholder": "email@example.com"
    },
    "phone": {
      "ui:widget": "tel"
    },
    "notes": {
      "ui:widget": "textarea"
    }
  }'::jsonb,
  'Users',
  '#8b5cf6',
  ARRAY['contact', 'crm', 'people', 'default'],
  TRUE,
  TRUE,
  TRUE,
  1,
  'active',
  'system',
  NOW(),
  NOW()
),

-- 3. Note/Memo
(
  gen_random_uuid(),
  'note',
  'Note',
  'Simple note-taking type for quick thoughts, reminders, and memos',
  'DOCUMENT',
  '{
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "maxLength": 200
      },
      "content": {
        "type": "string",
        "minLength": 1
      },
      "category": {
        "type": "string",
        "enum": ["personal", "work", "idea", "reminder", "other"],
        "default": "personal"
      },
      "isPinned": {
        "type": "boolean",
        "default": false
      },
      "color": {
        "type": "string",
        "enum": ["yellow", "blue", "green", "red", "purple"],
        "default": "yellow"
      }
    },
    "required": ["content"]
  }'::jsonb,
  '{
    "content": {
      "ui:widget": "textarea",
      "ui:options": {
        "rows": 5
      }
    },
    "isPinned": {
      "ui:widget": "checkbox"
    }
  }'::jsonb,
  'StickyNote',
  '#eab308',
  ARRAY['note', 'memo', 'quick', 'default'],
  TRUE,
  TRUE,
  TRUE,
  1,
  'active',
  'system',
  NOW(),
  NOW()
),

-- 4. Task/Todo Item
(
  gen_random_uuid(),
  'task',
  'Task',
  'Task management with priority, status, and due dates',
  'DATA',
  '{
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      "description": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "enum": ["todo", "in-progress", "done", "cancelled"],
        "default": "todo"
      },
      "priority": {
        "type": "string",
        "enum": ["low", "medium", "high", "urgent"],
        "default": "medium"
      },
      "dueDate": {
        "type": "string",
        "format": "date"
      },
      "assignee": {
        "type": "string"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "estimatedHours": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": ["title", "status"]
  }'::jsonb,
  '{
    "description": {
      "ui:widget": "textarea"
    },
    "dueDate": {
      "ui:widget": "date"
    },
    "status": {
      "ui:widget": "select"
    },
    "priority": {
      "ui:widget": "select"
    }
  }'::jsonb,
  'CheckSquare',
  '#10b981',
  ARRAY['task', 'todo', 'project', 'default'],
  TRUE,
  TRUE,
  TRUE,
  1,
  'active',
  'system',
  NOW(),
  NOW()
),

-- 5. Media File Reference
(
  gen_random_uuid(),
  'media-file',
  'Media File',
  'Reference to uploaded media files with metadata',
  'MEDIA',
  '{
    "type": "object",
    "properties": {
      "fileName": {
        "type": "string",
        "minLength": 1
      },
      "fileType": {
        "type": "string",
        "enum": ["image", "video", "audio", "document", "other"]
      },
      "mimeType": {
        "type": "string"
      },
      "fileSize": {
        "type": "integer",
        "minimum": 0,
        "description": "File size in bytes"
      },
      "url": {
        "type": "string",
        "format": "uri"
      },
      "thumbnailUrl": {
        "type": "string",
        "format": "uri"
      },
      "dimensions": {
        "type": "object",
        "properties": {
          "width": { "type": "integer" },
          "height": { "type": "integer" }
        }
      },
      "duration": {
        "type": "number",
        "description": "Duration in seconds for video/audio"
      },
      "alt": {
        "type": "string",
        "description": "Alternative text for accessibility"
      },
      "caption": {
        "type": "string"
      }
    },
    "required": ["fileName", "fileType", "url"]
  }'::jsonb,
  '{
    "url": {
      "ui:widget": "url"
    },
    "caption": {
      "ui:widget": "textarea"
    }
  }'::jsonb,
  'Image',
  '#f59e0b',
  ARRAY['media', 'file', 'upload', 'default'],
  TRUE,
  TRUE,
  TRUE,
  1,
  'active',
  'system',
  NOW(),
  NOW()
),

-- 6. Configuration/Settings
(
  gen_random_uuid(),
  'configuration',
  'Configuration',
  'Key-value configuration settings with validation',
  'CONFIGURATION',
  '{
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "minLength": 1,
        "pattern": "^[A-Z_]+$",
        "description": "Configuration key (uppercase, underscores)"
      },
      "value": {
        "type": "string",
        "description": "Configuration value"
      },
      "valueType": {
        "type": "string",
        "enum": ["string", "number", "boolean", "json"],
        "default": "string"
      },
      "description": {
        "type": "string"
      },
      "isSecret": {
        "type": "boolean",
        "default": false
      },
      "environment": {
        "type": "string",
        "enum": ["development", "staging", "production", "all"],
        "default": "all"
      }
    },
    "required": ["key", "value"]
  }'::jsonb,
  '{
    "key": {
      "ui:placeholder": "CONFIG_KEY_NAME"
    },
    "value": {
      "ui:widget": "textarea"
    },
    "isSecret": {
      "ui:widget": "checkbox",
      "ui:help": "Secret values will be encrypted"
    }
  }'::jsonb,
  'Settings',
  '#6366f1',
  ARRAY['config', 'settings', 'system', 'default'],
  TRUE,
  TRUE,
  TRUE,
  1,
  'active',
  'system',
  NOW(),
  NOW()
);

-- Create indexes on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_shard_types_name ON shard_types(name);
CREATE INDEX IF NOT EXISTS idx_shard_types_created_at ON shard_types(created_at DESC);

-- Grant permissions
GRANT SELECT ON shard_types TO authenticated;

-- Seed complete
SELECT 'Default ShardTypes seeded successfully' AS status,
       COUNT(*) AS total_types
FROM shard_types
WHERE is_system = TRUE AND tenant_id = 'system';
