export const listFunctionsQuery = `
  query ListFunctions(
    $projectNodeId: ID!
    $first: Int!
    $after: String
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        functions(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }

          nodes {
            ... on LambdaFunction {
              name
              nodeId
            }
          }
        }
      }
    }
  }
`;

export interface ListFunctionsQueryResponse {
  node: {
    functions: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };

      nodes: ReadonlyArray<{
        name: string;
        nodeId: string;
      }>;
    };
  };
}
