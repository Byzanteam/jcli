export const createProjectMutation = `
  mutation projectsCreateProjectMutation(
    $name: String!,
    $title: String!
  ) {
    projectsCreateProject(input: { name: $name, title: $title }) {
      project {
        id
        name
        title
      }
    }
  }
`;

export interface CreateProjectMutationResponse {
  projectsCreateProject: {
    project: {
      id: string;
      name: string;
      title: string;
    };
  };
}
