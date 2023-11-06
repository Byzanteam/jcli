export const createFunctionFileMutation = `
  mutation createDraftFile(
    $projectUuid: UUID!,
    $functionName: String!,
    $path: String!,
    $content: String!
  ) {
    createDraftFile(input: { projectUuid: $projectUuid, functionName: $functionName, path: $path, content: $content }) {
      draftFile {
        path
      }
    }
  }
`;
