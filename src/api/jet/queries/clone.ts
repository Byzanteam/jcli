interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface ProjectQueryResponse {
  node: {
    name: string;
    draftConfiguration: string;
  };
}

export interface ListDraftFunctionsQueryResponse {
  node: {
    draftFunctions: {
      pageInfo: PageInfo;
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

export interface ListDraftMigrationsQueryResponse {
  node: {
    draftMigrations: {
      pageInfo: PageInfo;
      nodes: ReadonlyArray<{
        version: number;
        name: string;
        hash: string;
        content: string;
      }>;
    };
  };
}

export interface ListDraftWorkflowsQueryResponse {
  node: {
    draftWorkflows: {
      pageInfo: PageInfo;
      nodes: ReadonlyArray<{ name: string; data: string; hash: string }>;
    };
  };
}

export const projectQuery = `
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

export const listDraftFunctionsQuery = `
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

export const listDraftMigrationsQuery = `
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

// TODO: align API implementation
export const listDraftWorkflowsQuery = `
  query ListDraftWorkflows(
    $projectNodeId: ID!
    $first: Int!
    $after: String
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        draftWorkflows(first: $first, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }

          nodes {
            ... on WorkflowsDraftWorkflow {
              name
              data
              hash
            }
          }
        }
      }
    }
  }
`;
