import { parse } from "@std/path";

/**
 * A migration filename looks like:
 *   202301010101.sql or
 *   202301010101_abc.sql
 * The leading number is the version and the optional trailing string is the name.
 * The length of the version must be 12. The name is consisted of lowercase letters,
 * numbers, and underscores.
 */
const MIGRATION_FILENAME_FORMAT =
  /^(?<version>\d{12})(_(?<name>[a-z0-9_]{0,26}))?$/;

export function buildVersionAndName(
  path: string,
): { version: number; name: string | null } {
  const { name } = parse(path);
  const result = MIGRATION_FILENAME_FORMAT.exec(name);

  if (result === null) {
    throw new Error(`Invalid migration filename ${name}`);
  } else {
    return {
      version: parseInt(result.groups!.version, 10),
      name: result.groups!.name ?? null,
    };
  }
}
