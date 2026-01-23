/**
 * GraphQL Resolvers
 * 
 * This is a starter set of resolvers that can be extended as needed
 */
export const resolvers = {
  Query: {
    hello: async () => {
      return 'Hello from Castiel Main API!';
    },
    
    health: async () => {
      return {
        status: 'ok',
        service: 'main-api',
        timestamp: new Date().toISOString(),
      };
    },
  },
};
