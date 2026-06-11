import { db, requireOrgRole } from "@kit/db";
import { auth } from "@/auth";
import { getActiveOrg } from "@/lib/org";
import { revokeApiKey } from "@/lib/api-keys";
import { CreateKeyForm } from "./create-key-form";

export const metadata = { title: "API Keys · WonderKit" };

export default async function ApiKeysPage() {
  const session = await auth();
  const { orgId } = await getActiveOrg();
  await requireOrgRole(session, orgId, "ADMIN");

  const keys = await db.apiKey.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-gray-500 mt-1">
          Keys grant programmatic access to your org. The plaintext key is shown once — copy it immediately.
        </p>
      </div>

      <CreateKeyForm orgId={orgId} />

      <div>
        <h2 className="text-base font-medium mb-3">Active keys ({keys.filter((k) => !k.revokedAt).length})</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-gray-400">No keys yet.</p>
        ) : (
          <div className="rounded-lg border divide-y text-sm">
            {keys.map((key) => (
              <div key={key.id} className={`px-4 py-3 flex items-center justify-between gap-4 ${key.revokedAt ? "opacity-50" : ""}`}>
                <div className="min-w-0">
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {key.revokedAt
                      ? `Revoked ${key.revokedAt.toLocaleDateString()}`
                      : key.lastUsedAt
                        ? `Last used ${key.lastUsedAt.toLocaleDateString()}`
                        : "Never used"}
                    {" · "}Created {key.createdAt.toLocaleDateString()}
                  </p>
                </div>
                {!key.revokedAt && (
                  <form action={async () => { "use server"; await revokeApiKey(orgId, key.id); }}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700 shrink-0">
                      Revoke
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
