import { DeploymentLogSeverity } from "@/api/mod.ts";

export const listDeploymentLogsQuery = `
query ListDeploymentLogs(
  $environmentNodeId: ID!
  $functionName: String
  $first: Int!
  $after: String
) {
  node(nodeId: $environmentNodeId) {
    ... on ProjectsEnvironment {
      deploymentLogs(first: $first, after: $after, functionName: $functionName) {
        pageInfo {
          hasNextPage
          endCursor
        }

        nodes {
          ... on ProjectsEnvironmentDeploymentLog {
            functionName
            message
            timestamp
            metadata {
              severity
              stacktrace
            }
          }
        }
      }
    }
  }
}
`;

export interface ListDeploymentLogsQueryResponse {
  node: {
    deploymentLogs: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };

      nodes: ReadonlyArray<{
        functionName: string;
        message: string;
        timestamp: string;
        metadata: {
          severity: DeploymentLogSeverity;
          stacktrace: string;
        };
      }>;
    };
  };
}
