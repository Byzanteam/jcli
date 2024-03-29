import { ProjectEnvironmentName } from "@/api/mod.ts";

export const listEnvironmentVariablesQuery = `
  query listEnvironmentVariables(
    $projectNodeId: ID!
    $first: Int!,
    $after: String
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        environments(first: 10) {
          nodes {
            ... on ProjectsEnvironment {
              name
              environmentVariables(first: $first, after: $after) {
                nodes {
                  ... on ProjectsEnvironmentVariable {
                    name
                    value
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
      }
    }
  }
`;

export interface ListEnvironmentVariablesQueryResponse {
  node: {
    environments: {
      nodes: ReadonlyArray<{
        name: ProjectEnvironmentName;
        environmentVariables: {
          pageInfo: {
            endCursor: string;
            hasNextPage: boolean;
          };

          nodes: ReadonlyArray<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
  };
}
