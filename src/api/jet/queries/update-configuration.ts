export const updateConfigurationMutation = `
  mutation projectsUpdateConfiguration(
    $projectId: UUID!,
    $command: ProjectsUpdateDraftConfigurationCommandInput!
  ) {
    projectsUpdateConfiguration(input: { projectId: $projectId, command: $command }) {
      project {
        id
      }
    }
  }
`;
