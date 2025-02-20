import { parse } from "path";

/**
 * A migration filename looks like:
 *   202301010101.sql or
 *   202301010101_abc.sql
 * The leading number is the version and the optional trailing string is the name.
 * The length of the version must be 12. The name is consisted of lowercase letters,
 * numbers, and underscores.
 */

export const MIGRATION_NAME_REGEX = /[a-z][a-z\d_]{0,254}/;

const VERSION_REGEX = /\d{12}/;

const MIGRATION_FILENAME_FORMAT = new RegExp(
  // NOTE: why name is optional?
  `^(?<version>${VERSION_REGEX.source})(_(?<name>${MIGRATION_NAME_REGEX.source}))?$`,
);

console.log(MIGRATION_FILENAME_FORMAT);

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
