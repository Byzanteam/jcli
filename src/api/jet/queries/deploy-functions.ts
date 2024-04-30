export const deployFunctionsMutation = `
  mutation lambdaDeployFunctions(
    $projectId: UUID!
  ) {
    lambdaDeployFunctions(input: {
      projectId: $projectId
    }) {
      project {
        id
      }
    }
  }
`;
