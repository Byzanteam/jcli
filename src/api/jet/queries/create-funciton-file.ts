export const createFunctionFileMutation = `
  mutation createDraftFile(
    $projectUuid: UUID!,
    $functionName: String!,
    $path: String!,
    $code: String!
  ) {
    createDraftFile(input: { projectUuid: $projectUuid, functionName: $functionName, path: $path, code: $code }) {
      draftFile {
        path
      }
    }
  }
`;
