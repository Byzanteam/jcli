export const migrateDBMutation = `
  mutation migrateDatabase(
    $projectUuid: UUID!,
  ) {
    migrateDatabase(input: { projectUuid: $projectUuid }) {
      project {
        uuid
      }
    }
  }
`;
