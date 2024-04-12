import * as ejs from "ejs";
import { api } from "@/api/mod.ts";

import { GithubWorkflowOptions } from "./option.ts";

const template = ejs.compile(
  `name: <%= name %>

on:
  push:
    branches: [<%= branches %>]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Setup repo
        uses: actions/checkout@v4

      - name: Setup jcli
        uses: byzanteam/setup-jcli@main
        with:
          version: <%= jcli.version %>
          jet-endpoint: <%= jcli.jetEndpoint %>

      - name: Deploy
        run: |
          cd "<%= project.distDir %>"
          jcli link "<%= project.id %>"
          jcli push
          jcli commit
          jcli deploy`,
);

export default function (options: GithubWorkflowOptions) {
  const content = template({
    name: options.name ?? "Deploy project",
    branches: options.branches ?? "main",
    jcli: {
      version: options.jcliVersion ?? "latest",
      jetEndpoint: options.jetEndpoint,
    },
    project: {
      id: options.projectId,
      distDir: options.distDir ?? "./",
    },
  });

  if (options.output) {
    api.fs.writeTextFile(options.output, content, { createNew: true });
  } else {
    api.console.log(content);
  }
}
