export const pluginInstallInstanceMutation = `
  mutation installPluginInstance(
    $environmentName: ProjectsEnvironmentName!,
    $instanceName: String!,
    $projectId: UUID!
  ) {
    pluginInstallInstance(input: { 
      environmentName: $environmentName, 
      instanceName: $instanceName, 
      projectId: $projectId 
    }) {
      instance {
        id
      }
    }
  }
`;
