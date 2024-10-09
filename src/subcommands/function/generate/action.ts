import { api } from "@/api/mod.ts";
import { GlobalOptions } from "@/args.ts";

const honoAppTemplateCode = `import { Hono } from "jsr:@hono/hono";
import { serveHttp } from "https://cdn.jsdelivr.net/gh/byzanteam/breeze-js@v0.2.2/lib/runtime.ts";

const app = new Hono();

app.get("/", (c) => c.text("Hello, Jet!"));

serveHttp(app.fetch);
`;

const validFunctionNameRegex = /^[a-zA-Z0-9_]+$/;

export default async function (_options: GlobalOptions, functionName: string) {
  if (!validFunctionNameRegex.test(functionName)) {
    api.console.log(
      "Invalid function name. Only alphanumeric characters and underscores are allowed.",
    );
    return undefined;
  }

  const dirPath = `functions/${functionName}`;
  const filePath = `${dirPath}/main.ts`;

  try {
    await api.fs.mkdir(dirPath, { recursive: true });

    await api.fs.writeTextFile(filePath, honoAppTemplateCode, {
      createNew: true,
    });
  } catch (error) {
    api.console.log(`Error creating '${filePath}': ${error}`);
  }
}
