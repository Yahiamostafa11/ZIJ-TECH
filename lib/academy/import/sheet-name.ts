/**
 * Excel tab name for a group: at most 31 characters and none of : \ / ? * [ ].
 * Shared by the export and the import's automatic tab-to-group matching, so
 * an exported workbook re-imports onto the same groups.
 */
export function sheetNameFor(groupName: string) {
  const cleaned = groupName.replace(/[:\\/?*[\]]/g, "-").replace(/^'+|'+$/g, "").trim();
  return (cleaned || "Group").slice(0, 31).trim();
}
