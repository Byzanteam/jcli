export const deployDraftFunctionsMutation = `
  mutation lambdaDeployDraftFunctions(
    $projectId: UUID!
  ) {
    lambdaDeployDraftFunctions(input: {
      projectId: $projectId
    }) {
      project {
        id
      }
    }
  }
`;
