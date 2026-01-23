/**
 * Placeholder for shared utilities
 * This will be populated as we build out the services
 */

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
