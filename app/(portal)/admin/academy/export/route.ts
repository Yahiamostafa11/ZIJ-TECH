import { buildGroupsWorkbook } from "@/lib/academy/export";
import { todayInCairo } from "@/lib/academy/format";
import { listGroups } from "@/lib/academy/queries";
import { requireGroup } from "@/lib/academy/scope";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * GET /admin/academy/export            → every group in the list's current filter
 * GET /admin/academy/export?group=12   → one group
 */
export async function GET(request: Request) {
  const user = await requirePermission("groups.read");
  const params = new URL(request.url).searchParams;

  let groupIds: number[];
  let fileName: string;
  let asciiName: string;
  const single = Number(params.get("group"));
  if (single) {
    const group = await requireGroup(user, single, "groups.read");
    groupIds = [group.id];
    fileName = `${group.name}.xlsx`;
    asciiName = `zij-group-${group.id}.xlsx`;
  } else {
    const groups = await listGroups(user, {
      status: params.get("status") ?? undefined,
      mode: params.get("mode") ?? undefined,
    });
    groupIds = groups.map((group) => group.id);
    fileName = `zij-groups-${todayInCairo()}.xlsx`;
    asciiName = fileName;
  }

  // Group names are usually Arabic: send an ASCII fallback plus the UTF-8 name.
  const buffer = await buildGroupsWorkbook(groupIds, { includeMoney: can(user.grants, "payments.read") });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
