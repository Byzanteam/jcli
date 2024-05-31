import { GlobalOptions } from "@/args.ts";
import { getConfig } from "@/api/mod.ts";
import { getLogger } from "@/jcli/logger.ts";

export default async function action(_options: GlobalOptions) {
  await removeCredential();
}

async function removeCredential() {
  const logger = getLogger();

  const configData = await getConfig().get();

  if (
    configData.authentications &&
    configData.authentications[configData.jetEndpoint]
  ) {
    delete configData.authentications[configData.jetEndpoint];
    logger.info(
      `The credential for the endpoint ${configData.jetEndpoint} has been removed.`,
    );

    await getConfig().set(configData);
  } else {
    logger.info(
      `The credential for the endpoint ${configData.jetEndpoint} have not yet been set, nothing happened.`,
    );
  }
}
