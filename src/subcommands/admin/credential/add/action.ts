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

  const tokenExisting = Boolean(
    configData.authentications?.[configData.jetEndpoint]
      ?.token,
  );

  if (!configData.authentications) {
    configData.authentications = {};
  }

  configData.authentications[configData.jetEndpoint] = { token };

  if (tokenExisting) {
    logger.info(
      `The credential for the endpoint ${configData.jetEndpoint} is replaced.`,
    );
  } else {
    logger.info(
      `The credential for the endpoint ${configData.jetEndpoint} is set.`,
    );
  }

  await getConfig().set(configData);
}
