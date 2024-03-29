const listEnvironmentsQuery = `
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

interface ListEnvironmentsQueryResponse {
  node: {
    environments: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };

      nodes: ReadonlyArray<{
        name: "DEVELOPMENT" | "PRODUCTION";
        nodeId: string;
      }>;
    };
  };
}

const listDeploymentLogsQuery = `
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

interface ListDeploymentLogsQueryResponse {
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
          severity: "INFO" | "ERROR" | "DEBUG" | "WARN";
          stacktrace: string;
        };
      }>;
    };
  };
}

export { listDeploymentLogsQuery, listEnvironmentsQuery };
export type { ListDeploymentLogsQueryResponse, ListEnvironmentsQueryResponse };
