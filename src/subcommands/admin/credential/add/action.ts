import { GlobalOptions } from "@/args.ts";
import { getConfig } from "@/api/mod.ts";
import { getLogger } from "@/jcli/logger.ts";

export default async function action(
  _options: GlobalOptions,
  token: string,
) {
  await addCredential(token);
}

async function addCredential(token: string) {
  const logger = getLogger();

  const configData = await getConfig().get();

  if (!configData.authentications) {
    configData.authentications = {};
  }

  const existingToken = configData.authentications[configData.jetEndpoint];

  if (existingToken) {
    logger.info(
      `Updating existing credential for endpoint ${configData.jetEndpoint}`,
    );
  } else {
    logger.info(
      `No existing credential found for endpoint ${configData.jetEndpoint}. Setting new credential.`,
    );
  }

  configData.authentications[configData.jetEndpoint] = { token };
  logger.info(
    `Credential added for endpoint ${configData.jetEndpoint}: Token set`,
  );

  await getConfig().set(configData);
}
