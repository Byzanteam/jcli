export const createProjectMutation = `
  mutation createProjectMutation(
    $name: String!,
    $title: String!
  ) {
    createProject(input: { name: $name, title: $title }) {
      project {
        uuid
        name
        title
      }
    }
  }
`;

export interface CreateProjectMutationResponse {
  createProject: {
    project: {
      uuid: string;
      name: string;
      title: string;
    };
  };
}
