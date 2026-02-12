/**
 * Accounts list page — module and default export (smoke).
 * For full render tests, use jsdom environment and @testing-library/react.
 */

import { describe, it, expect } from 'vitest';
import AccountsListPage from './page';

describe('AccountsListPage', () => {
  it('exports a default component', () => {
    expect(AccountsListPage).toBeDefined();
    expect(typeof AccountsListPage).toBe('function');
  });
});
