export const updateFunctionFileMutation = `
  mutation updateDraftFile(
    $projectUuid: UUID!,
    $functionName: String!,
    $path: String!,
    $content: String!
  ) {
    updateDraftFile(input: { projectUuid: $projectUuid, functionName: $functionName, path: $path, content: $content }) {
      draftFile {
        path
      }
    }
  }
`;
