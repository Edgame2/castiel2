/**
 * Test Auto-Fixer - Automatically fixes common test issues
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Ensure glob is available
const globAsync = glob;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestAutoFixer {
  /**
   * Fix all common test issues
   */
  async fixAll(): Promise<{ fixed: number; failed: number; details: string[] }> {
    let fixed = 0;
    let failed = 0;
    const details: string[] = [];

    try {
      const result = await this.fixMockConfigurations();
      if (result.fixed > 0) {
        fixed++;
        details.push(`Fixed ${result.fixed} mock configuration(s)`);
      }
      if (result.failed > 0) {
        failed++;
        details.push(`Failed to fix ${result.failed} mock(s)`);
      }
    } catch (e) {
      failed++;
      details.push(`Mock fix error: ${e}`);
      console.error('Failed to fix mocks:', e);
    }

    try {
      const result = await this.fixSyntaxErrors();
      if (result.fixed > 0) {
        fixed++;
        details.push(`Fixed ${result.fixed} syntax error(s)`);
      }
      if (result.failed > 0) {
        failed++;
        details.push(`Failed to fix ${result.failed} syntax error(s)`);
      }
    } catch (e) {
      failed++;
      details.push(`Syntax fix error: ${e}`);
      console.error('Failed to fix syntax:', e);
    }

    try {
      const result = await this.fixMissingImports();
      if (result.fixed > 0) {
        fixed++;
        details.push(`Fixed ${result.fixed} import(s)`);
      }
    } catch (e) {
      failed++;
      details.push(`Import fix error: ${e}`);
      console.error('Failed to fix imports:', e);
    }

    return { fixed, failed, details };
  }

  /**
   * Fix mock configurations in test files
   */
  private async fixMockConfigurations(): Promise<{ fixed: number; failed: number }> {
    let fixed = 0;
    let failed = 0;

    try {
      // When run from apps/api, process.cwd() is already apps/api
      const baseDir = process.cwd().endsWith('apps/api') ? process.cwd() : resolve(process.cwd(), 'apps/api');
      const testFiles = await glob('**/*.{test,spec}.ts', {
        cwd: baseDir,
        ignore: ['node_modules/**', 'dist/**', '.turbo/**'],
      });

      for (const file of testFiles) {
        const filePath = resolve(baseDir, file);
        if (!existsSync(filePath)) continue;

        let content = readFileSync(filePath, 'utf-8');
        let modified = false;

        // Fix authorization tests - add JWT mock
        if (file.includes('authorization.security.test.ts')) {
          if (!content.includes('jwt:') && content.includes('const request = {')) {
            content = content.replace(
              /const request = \{/,
              `const request = {
      jwt: {
        verify: vi.fn(() => ({ id: 'test-user', tenantId: 'test-tenant' })),
      },`
            );
            modified = true;
          }
        }

        // Fix rate limiting tests - add reply.header mock
        if (file.includes('rate-limiting.security.test.ts')) {
          if (!content.includes('header:') && content.includes('const reply = {')) {
            content = content.replace(
              /const reply = \{/,
              `const reply = {
      header: vi.fn(),
      code: vi.fn(() => reply),
      send: vi.fn(),`
            );
            modified = true;
          }
        }

        // Fix notification tests - ensure NotificationChannel import
        if (file.includes('notification') && !content.includes('NotificationChannel')) {
          // Check if we need to add the import
          if (content.includes("from '@castiel") && !content.includes('NotificationChannel')) {
            // Try to find where to add the import
            const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@castiel\/[^'"]+['"]/);
            if (importMatch && !importMatch[1].includes('NotificationChannel')) {
              // Add NotificationChannel to existing import
              content = content.replace(
                importMatch[0],
                importMatch[0].replace(importMatch[1], `${importMatch[1]}, NotificationChannel`)
              );
              modified = true;
            }
          }
        }

        if (modified) {
          writeFileSync(filePath, content);
          console.log(`✅ Fixed mocks in: ${file}`);
          fixed++;
        }
      }
    } catch (error) {
      console.error('Error fixing mocks:', error);
      failed++;
    }

    return { fixed, failed };
  }

  /**
   * Fix syntax errors in test files
   */
  private async fixSyntaxErrors(): Promise<{ fixed: number; failed: number }> {
    let fixed = 0;
    let failed = 0;

    // Fix duplicate declarations in ai-model-selection.service.test.ts
    const baseDir = process.cwd().endsWith('apps/api') ? process.cwd() : resolve(process.cwd(), 'apps/api');
    const filePath = resolve(baseDir, 'tests/services/ai/ai-model-selection.service.test.ts');
    
    if (existsSync(filePath)) {
      try {
        let content = readFileSync(filePath, 'utf-8');
        let modified = false;

        // Remove duplicate const/let/var declarations
        // This is a simplified fix - you may need more sophisticated detection
        const lines = content.split('\n');
        const seenDeclarations = new Set<string>();
        const newLines: string[] = [];

        for (const line of lines) {
          const declarationMatch = line.match(/^(const|let|var)\s+(\w+)\s*=/);
          if (declarationMatch) {
            const varName = declarationMatch[2];
            if (seenDeclarations.has(varName)) {
              // Skip duplicate declaration
              modified = true;
              continue;
            }
            seenDeclarations.add(varName);
          }
          newLines.push(line);
        }

        if (modified) {
          content = newLines.join('\n');
          writeFileSync(filePath, content);
          console.log(`✅ Fixed syntax errors in: ai-model-selection.service.test.ts`);
          fixed++;
        }
      } catch (error) {
        console.error('Error fixing syntax:', error);
        failed++;
      }
    }

    return { fixed, failed };
  }

  /**
   * Fix missing imports
   */
  private async fixMissingImports(): Promise<{ fixed: number; failed: number }> {
    let fixed = 0;
    let failed = 0;

    try {
      // When run from apps/api, process.cwd() is already apps/api
      const baseDir = process.cwd().endsWith('apps/api') ? process.cwd() : resolve(process.cwd(), 'apps/api');
      const testFiles = await glob('**/*.{test,spec}.ts', {
        cwd: baseDir,
        ignore: ['node_modules/**', 'dist/**', '.turbo/**'],
      });

      for (const file of testFiles) {
        const filePath = resolve(baseDir, file);
        if (!existsSync(filePath)) continue;

        let content = readFileSync(filePath, 'utf-8');
        let modified = false;

        // Check if file uses vi but doesn't import it
        if (content.includes('vi.') || content.includes('vi.fn') || content.includes('vi.mock')) {
          if (!content.includes("import { vi }") && !content.includes("import { vi,")) {
            // Find the first import statement
            const firstImportMatch = content.match(/^import\s+/m);
            if (firstImportMatch) {
              const insertPos = firstImportMatch.index!;
              content = content.slice(0, insertPos) + 
                        "import { vi } from 'vitest';\n" + 
                        content.slice(insertPos);
              modified = true;
            } else {
              // No imports, add at the top
              content = "import { vi } from 'vitest';\n\n" + content;
              modified = true;
            }
          }
        }

        if (modified) {
          writeFileSync(filePath, content);
          console.log(`✅ Fixed imports in: ${file}`);
          fixed++;
        }
      }
    } catch (error) {
      console.error('Error fixing imports:', error);
      failed++;
    }

    return { fixed, failed };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new TestAutoFixer();
  const result = await fixer.fixAll();
  console.log('\n🔧 Auto-Fix Results:');
  console.log(`   Fixed: ${result.fixed}`);
  console.log(`   Failed: ${result.failed}`);
  if (result.details.length > 0) {
    console.log('\n   Details:');
    result.details.forEach(detail => console.log(`   - ${detail}`));
  }
  process.exit(result.failed > 0 ? 1 : 0);
}
