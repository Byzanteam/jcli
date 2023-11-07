export const deleteFunctionMutation = `
  mutation deleteDraftFunction(
    $projectUuid: UUID!,
    $functionName: String!,
  ) {
    deleteDraftFunction(input: { projectUuid: $projectUuid, functionName: $FunctionName}) {
      draftFunction {
        name
      }
    }
  }
`;
