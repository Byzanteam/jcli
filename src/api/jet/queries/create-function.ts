export const createFunctionMutation = `
  mutation lambdaCreateDraftFunction(
    $projectId: UUID!,
    $name: String!,
    $title: String!,
  ) {
    lambdaCreateDraftFunction(input: { projectId: $projectId, name: $name, title: $title}) {
      draftFunction {
        name
      }
    }
  }
`;
