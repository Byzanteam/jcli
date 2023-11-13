export const rollbackDBMutation = `
  mutation rollbackDatabase(
    $projectUuid: UUID!,
  ) {
    rollbackDatabase(input: { projectUuid: $projectUuid }) {
      project {
        uuid
      }
    }
  }
`;
