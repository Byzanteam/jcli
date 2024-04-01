import { Deployment } from "@/api/mod.ts";

export const inspectFunctionQuery = `
  query InspectFunction(
    $functionNodeId: ID!
  ) {
    node(nodeId: $functionNodeId) {
      ... on LambdaDraftFunction {
        deployment {
          state
        }
      }

      ... on LambdaFunction {
        deployment {
          state
        }
      }
    }
  }
`;

export interface InspectFunctionQueryResponse {
  node: {
    deployment: Deployment;
  };
}
