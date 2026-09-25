import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type Executor = Pick<typeof db, "insert">;

/** Appends an audit entry. Pass the transaction when inside one. */
export async function audit(
  executor: Executor,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  details?: Record<string, unknown>,
) {
  await executor.insert(auditLog).values({
    actorId,
    action,
    entity,
    entityId: entityId === null ? null : String(entityId),
    details: details ? JSON.stringify(details) : null,
  });
}
