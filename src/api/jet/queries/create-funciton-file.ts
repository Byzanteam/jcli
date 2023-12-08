export const createFunctionFileMutation = `
  mutation lambdaCreateDraftFile(
    $projectId: UUID!,
    $functionName: String!,
    $path: String!,
    $code: String!
  ) {
    lambdaCreateDraftFile(input: { projectId: $projectId, functionName: $functionName, path: $path, code: $code }) {
      draftFile {
        path
      }
    }
  }
`;
