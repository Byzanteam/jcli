import { ProjectEnvironmentName } from "@/api/mod.ts";

export const listEnvironmentsQuery = `
  query ListEnvironmentVariables(
    $projectNodeId: ID!
    $first: Int!
    $after: String
  ) {
    node(nodeId: $projectNodeId) {
      ... on ProjectsProject {
        environments(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }

          nodes {
            ... on ProjectsEnvironment {
              name
              nodeId
            }
          }
        }
      }
    }
  }
`;

export interface ListEnvironmentsQueryResponse {
  node: {
    environments: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };

      nodes: ReadonlyArray<{
        name: ProjectEnvironmentName;
        nodeId: string;
      }>;
    };
  };
}
