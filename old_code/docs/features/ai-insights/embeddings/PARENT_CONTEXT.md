# Parent Project Context for Embeddings

This document explains how to include a lightweight parent `c_project` context in both shard embeddings and query embeddings.

## Why include project context?

- Disambiguates common titles (e.g., "Weekly update", "Sprint notes").
- Clusters project-specific content together, improving recall for project-scoped searches.
- Keeps the context small and low-weight to avoid semantic drift.

## Template Configuration

We added `parentContext` to `EmbeddingTemplate` and context-prefix options:

```ts
interface ParentContextConfig {
  mode: 'whenScoped' | 'always' | 'never';
  sourceShardType?: string;        // e.g., 'c_project'
  weight?: number;                 // relative importance (0.0 - 1.0)
  fields?: string[];               // ['name','tags','summary']
  asContextPrefix?: boolean;       // prepend to each chunk (recommended)
  separator?: string;              // default: ' — '
  maxLength?: number;              // default: 120 chars
}
```

Defaults (in the default template):

```ts
parentContext: {
  mode: 'whenScoped',
  sourceShardType: 'c_project',
  weight: 0.25,
  fields: ['name','tags','summary'],
  asContextPrefix: true,
  separator: ' — ',
  maxLength: 120,
}
```

You can also mark regular fields with:

```ts
interface EmbeddingFieldConfig {
  asContextPrefix?: boolean; // prefix to chunks
  maxLength?: number;        // cap for this field when used as context
}
```

## How it is applied

- Shard Embeddings (server):
  - If `parentContext.mode === 'always'` and the shard has a `parentShardId`, we fetch the parent shard.
  - We build a compact prefix: `Project: <name> | Tags: a,b | <summary>`.
  - We prepend this prefix to each chunk (if `asContextPrefix`), or to the combined text before chunking.

- Query Embeddings (search):
  - If a `projectId` is provided in the vector search request filter (via `filter.projectId` or `filter.metadata.projectId`), we fetch the project shard and prepend the same compact prefix to the query text before embedding.

## Best practices

- Keep the parent context short (≤ 25 tokens / ~120 chars).
- Use low weight (≈ 0.25) to minimize drift.
- Prefer strict project filter at query time; use query prefix as a helper, not the sole disambiguator.
- Avoid volatile parent fields (IDs, dates, status) in the prefix.

## Implementation files

- `apps/api/src/types/embedding-template.types.ts` – new `parentContext` + options
- `apps/api/src/services/embedding-template.service.ts` – context prefix support in `preprocessText`
- `apps/api/src/services/shard-embedding.service.ts` – applies parent context for shards (always mode)
- `apps/api/src/services/vector-search.service.ts` – applies project context for queries (when scoped)
- `apps/api/src/routes/index.ts` – DI wiring for services

## Using in practice

- To always include project context in child shard embeddings, set the shard type's template:

```json
{
  "parentContext": { "mode": "always" }
}
```

- For project-scoped searches, pass a project ID in the filter:

```json
{
  "query": "weekly risks",
  "filter": { "tenantId": "...", "projectId": "<project-shard-id>" }
}
```

The system will prepend the compact project prefix automatically.
