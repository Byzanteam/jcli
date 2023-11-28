export const deployDraftFunctionsMutation = `
  mutation projectLambdaDeployDraftFunctions(
    $projectId: UUID!
  ) {
    projectLambdaDeployDraftFunctions(input: {
      projectId: $projectId
    }) {
      project {
        uuid
      }
    }
  }
`;
