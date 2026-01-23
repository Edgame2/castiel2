/**
 * GraphQL Schema Definition
 *
 * This is a starter schema that can be extended as needed
 */
export const schema = `
  type Query {
    hello: String!
    health: HealthStatus!
  }

  type HealthStatus {
    status: String!
    service: String!
    timestamp: String!
  }
`;
//# sourceMappingURL=schema.js.map