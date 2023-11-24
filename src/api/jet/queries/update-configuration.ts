export const updateConfigurationMutation = `
  mutation updateConfiguration(
    $projectId: UUID!,
    $command: UpdateDraftConfigurationCommandInput!
  ) {
    updateConfiguration(input: { projectId: $projectId, command: $command }) {
      project {
        uuid
      }
    }
  }
`;
