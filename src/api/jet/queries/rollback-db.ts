export const rollbackDBMutation = `
  mutation rollback(
    $projectUuid: UUID!,
  ) {
    rollback(input: { projectUuid: $projectUuid }) {
      lastMigratedVersion
    }
  }
`;
