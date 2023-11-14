export const listMigrationsQuery = `
  query ListMigrations(projectUuid: UUID!) {
    listMigrations(input: { projectUuid: $projectUuid }) {
      draftMigration {
        version
      }
    }
  }
`;
