export const configurationHashQuery = `
  query projectsConfigurationHash($configuration: String!) {
    projectsConfigurationHash(configuration: $configuration)
  }
`;

export interface ConfigurationHashQueryResponse {
  projectsConfigurationHash: string;
}
