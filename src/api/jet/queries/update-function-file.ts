export const updateFunctionFileMutation = `
  mutation lambdaUpdateDraftFile(
    $projectId: UUID!,
    $functionName: String!,
    $path: String!,
    $code: String!
  ) {
    lambdaUpdateDraftFile(input: { projectId: $projectId, functionName: $functionName, path: $path, code: $code}) {
      draftFile {
        path
      }
    }
  }
`;
