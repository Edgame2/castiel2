import { z } from "zod"

export const createShardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  shardTypeId: z.string().uuid("Invalid shard type"),
  metadata: z.record(z.string(), z.any()).optional(),
  unstructuredData: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  isPublic: z.boolean(),
})

export type CreateShardFormData = z.infer<typeof createShardSchema>

export const updateShardSchema = createShardSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdateShardFormData = z.infer<typeof updateShardSchema>

// ShardType validation
export const createShardTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  schema: z.record(z.string(), z.any()),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export type CreateShardTypeFormData = z.infer<typeof createShardTypeSchema>

export const updateShardTypeSchema = createShardTypeSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdateShardTypeFormData = z.infer<typeof updateShardTypeSchema>
