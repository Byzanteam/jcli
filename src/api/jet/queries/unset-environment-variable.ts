export const unsetEnvironmentVariableMutation = `
  mutation projectsUnsetEnvironmentVariable(
    $projectId: UUID!
    $environmentName: ProjectsEnvironmentName!
    $name: String!
  ) {
    projectsUnsetEnvironmentVariable(input: {
      projectId: $projectId,
      environmentName: $environmentName,
      name: $name
    }) {
      environmentVariable {
        id
      }
    }
  }
`;
