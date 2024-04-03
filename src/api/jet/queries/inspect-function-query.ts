import { Deployment } from "@/api/mod.ts";

export const inspectFunctionQuery = `
  query InspectFunction(
    $functionNodeId: ID!
  ) {
    node(nodeId: $functionNodeId) {
      ... on LambdaDraftFunction {
        deployment {
          state
          endpoint
        }
      }

      ... on LambdaFunction {
        deployment {
          state
          endpoint
        }
      }
    }
  }
`;

export interface InspectFunctionQueryResponse {
  node: {
    deployment: Deployment;
    endpoint?: string;
  };
}
