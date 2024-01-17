const projectQuery = `
query Project(
  $projectNodeId: ID!
) {
  node(nodeId: $projectNodeId) {
    ... on ProjectsProject {
      name
      draftConfiguration
    }
  }
}
`;

const listDraftMigrationsQuery = `
  query ListDraftMigrations(
    $projectNodeId: ID!
    $first: Int!
    $after: String
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        draftMigrations(first: $first, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            ... on DatabaseDraftMigration {
              version
              name
              hash
              content
            }
          }
        }
      }
    }
  }
`;

const listDraftFunctionsQuery = `
  query ListDraftFunctions(
    $projectNodeId: ID!
    $first: Int!
    $after: String
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        draftFunctions(first: $first, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            ... on LambdaDraftFunction {
              name
              files {
                path
                hash
                settings {
                  code
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface ProjectQueryResponse {
  node: {
    name: string;
    draftConfiguration: string;
  };
}

interface ListDraftMigrationsQueryResponse {
  node: {
    draftMigrations: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
      nodes: ReadonlyArray<{
        version: number;
        name: string;
        hash: string;
        content: string;
      }>;
    };
  };
}

interface ListDraftFunctionsQueryResponse {
  node: {
    draftFunctions: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
      nodes: ReadonlyArray<{
        name: string;
        files: ReadonlyArray<{
          path: string;
          hash: string;
          settings: {
            code: string;
          };
        }>;
      }>;
    };
  };
}

export { listDraftFunctionsQuery, listDraftMigrationsQuery, projectQuery };
export type {
  ListDraftFunctionsQueryResponse,
  ListDraftMigrationsQueryResponse,
  ProjectQueryResponse,
};
