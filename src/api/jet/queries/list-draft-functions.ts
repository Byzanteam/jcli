export const listDraftFunctionsQuery = `
  query ListDraftFunctions(
    $projectNodeId: ID!
    $first: Int!
    $after: String
    $includeFiles: Boolean!
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        draftFunctions(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }

          nodes {
            ... on LambdaDraftFunction {
              name
              nodeId
              files @include(if: $includeFiles) {
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

export interface ListDraftFunctionsQueryResponse {
  node: {
    draftFunctions: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };

      nodes: ReadonlyArray<{
        name: string;
        nodeId: string;
        files?: ReadonlyArray<{
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
