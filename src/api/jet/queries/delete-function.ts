export const deleteFunctionMutation = `
  mutation lambdaDeleteDraftFunction(
    $projectId: UUID!,
    $functionName: String!,
  ) {
    lambdaDeleteDraftFunction(input: { projectId: $projectId, functionName: $functionName}) {
      draftFunction {
        name
      }
    }
  }
`;
