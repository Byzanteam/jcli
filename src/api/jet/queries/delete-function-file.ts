export const deleteFunctionFileMutation = `
  mutation deleteDraftFile(
    $projectUuid: UUID!,
    $functionName: String!,
    $path: String!
  ) {
    deleteDraftFile(input: { projectUuid: $projectUuid, functionName: $functionName, path: $path }) {
      draftFile {
        path
      }
    }
  }
`;
