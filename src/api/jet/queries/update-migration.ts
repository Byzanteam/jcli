export const updateMigrationMutation = `
  mutation databaseUpdateDraftMigration($input: DatabaseUpdateDraftMigrationInput!) {
    databaseUpdateDraftMigration(input: $input) {
      draftMigration {
        version
      }
    }
  }
`;
