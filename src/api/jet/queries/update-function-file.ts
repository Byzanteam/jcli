export const updateFunctionFileMutation = `
  mutation updateDraftFile(
    $projectUuid: UUID!,
    $functionName: String!,
    $path: String!,
    $code: String!
  ) {
    updateDraftFile(input: { projectUuid: $projectUuid, functionName: $functionName, path: $path, code: $code}) {
      draftFile {
        path
      }
    }
  }
`;
