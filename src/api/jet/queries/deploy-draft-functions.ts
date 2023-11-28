export const deployDraftFunctionsMutation = `
  mutation projectDeployDraftFunctions(
    $projectId: UUID!
  ) {
    projectDeployDraftFunctions(input: {
      projectId: $projectId
    }) {
      project {
        uuid
      }
    }
  }
`;
