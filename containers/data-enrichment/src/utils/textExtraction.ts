/**
 * Text Extraction Utilities
 * Extract text from shard data for enrichment processing
 */

/**
 * Extract text from shard structured data
 */
export function extractTextFromShard(shard: any): string {
  const texts: string[] = [];

  // Extract from structuredData
  if (shard.structuredData) {
    const structuredText = extractFromStructuredData(shard.structuredData);
    if (structuredText) {
      texts.push(structuredText);
    }
  }

  // Extract from unstructuredData
  if (shard.unstructuredData?.text) {
    texts.push(shard.unstructuredData.text);
  }

  // Extract from metadata
  if (shard.metadata?.description) {
    texts.push(shard.metadata.description);
  }

  // Extract from name/title fields
  if (shard.name) {
    texts.push(shard.name);
  }
  if (shard.title) {
    texts.push(shard.title);
  }

  return texts.filter(Boolean).join('\n\n');
}

/**
 * Extract text from structured data (recursively flatten object)
 */
function extractFromStructuredData(data: any): string {
  const texts: string[] = [];

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const text = extractFromStructuredData(item);
      if (text) {
        texts.push(text);
      }
    }
  } else if (data && typeof data === 'object') {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        if (value !== null && value !== undefined) {
          const text = extractFromStructuredData(value);
          if (text) {
            texts.push(text);
          }
        }
      }
    }
  }

  return texts.filter(Boolean).join(' ');
}
