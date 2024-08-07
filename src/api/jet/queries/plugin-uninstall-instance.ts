export const pluginUninstallInstanceMutation = `
  mutation uninstallPluginInstance(
    $environmentName: ProjectsEnvironmentName!,
    $instanceName: String!,
    $projectId: UUID!
  ) {
    pluginUninstallInstance(input: { 
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
