export const deleteFunctionFileMutation = `
  mutation lambdaDeleteDraftFile(
    $projectId: UUID!,
    $functionName: String!,
    $path: String!
  ) {
    lambdaDeleteDraftFile(input: { projectId: $projectId, functionName: $functionName, path: $path }) {
      draftFile {
        path
      }
    }
  }
`;
