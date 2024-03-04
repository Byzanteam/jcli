export const pluginEnableInstanceMutation = `
  mutation enablePluginInstance(
    $environmentName: String!,
    $instanceName: String!,
    $projectId: UUID!
  ) {
    pluginEnableInstance(input: { 
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
