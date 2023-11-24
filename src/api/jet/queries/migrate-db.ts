export const migrateDBMutation = `
  mutation migrate(
    $projectUuid: UUID!,
  ) {
    migrate(input: { projectUuid: $projectUuid }) {
      lastMigratedVersion
    }
  }
`;
