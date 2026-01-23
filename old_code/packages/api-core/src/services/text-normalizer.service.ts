import { InvocationContext } from '@azure/functions';

export class TextNormalizerService {
  constructor(private context: InvocationContext) {}

  normalize(text: string): string {
    let normalized = text;

    // Remove page breaks and excessive newlines
    normalized = normalized.replace(/\f/g, '\n').replace(/\n{3,}/g, '\n\n');

    // Fix encoding issues (common in PDFs)
    normalized = this.fixEncoding(normalized);

    // Remove extra whitespace while preserving paragraph structure
    normalized = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Remove common boilerplate patterns
    normalized = this.removeBoilerplate(normalized);

    // Fix common spacing issues
    normalized = normalized.replace(/\s+/g, ' ').trim();

    this.context.log(`Normalized text from ${text.length} to ${normalized.length} characters`);

    return normalized;
  }

  private fixEncoding(text: string): string {
    // Common encoding issues
    const replacements: Record<string, string> = {
      '\u00ad': '', // Soft hyphen
      '\u200b': '', // Zero-width space
      '\u200c': '', // Zero-width non-joiner
      '\u200d': '', // Zero-width joiner
      '\ufeff': '', // BOM
    };

    let result = text;
    for (const [from, to] of Object.entries(replacements)) {
      result = result.split(from).join(to);
    }
    return result;
  }

  private removeBoilerplate(text: string): string {
    // Remove header/footer patterns
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      const lower = line.toLowerCase();
      // Skip page numbers, dates, common header/footer patterns
      return (
        !/^\d+$/.test(line) &&
        !/^page\s+\d+/i.test(line) &&
        !/^©|®|™/i.test(line) &&
        !/confidential|proprietary|internal use only/i.test(line) &&
        !/^[a-z]+@[a-z]+\.[a-z]+$/i.test(line) &&
        line.length > 3
      );
    });

    return filtered.join('\n');
  }
}
