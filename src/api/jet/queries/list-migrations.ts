export const listMigrationsQuery = `
  query ListMigrations(
    $projectId: ID!,
    $first: Int!,
    $after: String
  ) {
    node(id: $projectId) {
      ... on ProjectsProject {
        migrations(first: $first, after: $after) {
          nodes {
            ... on DatabaseMigrationRecord {
              version
            }
          }

          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

export interface ListMigrationsQueryResponse {
  node: {
    migrations: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };

      nodes: Array<{
        version: number;
      }>;
    };
  };
}
