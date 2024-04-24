import { GlobalOptions } from "@/args.ts";
import { Table } from "cliffy-table";
import { api } from "@/api/mod.ts";

export default async function action(
  _options: GlobalOptions,
) {
  const tableData = [["Name", "Id"]];
  const projects = await api.jet.listProjects();

  projects.forEach(({ id, name }) => {
    tableData.push([name, id]);
  });

  const table = Table.from(tableData);
  api.console.log(table.toString());
}
