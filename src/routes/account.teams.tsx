import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SitePage } from "@/components/site/SitePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listTeams,
  getTeam,
  manageTeam,
  downloadTeamSkill,
  downloadTeamPin,
  type TeamAction,
} from "@/lib/teams/teams.functions";
import { toast } from "sonner";
export const Route = createFileRoute("/account/teams")({
  head: () => ({ meta: [{ title: "Team workspaces — Super Agent Skill" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    typeof s.invite === "string" ? { invite: s.invite } : {},
  component: Teams,
});
function Teams() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listTeams),
    get = useServerFn(getTeam),
    manage = useServerFn(manageTeam),
    download = useServerFn(downloadTeamSkill),
    downloadPin = useServerFn(downloadTeamPin);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
  const [inviteLink, setInviteLink] = useState("");
  const [extras, setExtras] = useState("");
  const [slug, setSlug] = useState("team-skill");
  const [version, setVersion] = useState("0.1.0");
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(
    "---\nname: team-skill\ndescription: Use when preparing a source-grounded report for the team.\n---\n\n# Instructions\nRead the supplied sources and identify the requested deliverable. Preserve source identifiers, check the reporting period and distinguish observations from hypotheses. Report missing information rather than inventing it. Draft the result for a human reviewer and do not publish or take external actions without authorization.\n",
  );
  const [pinSlug, setPinSlug] = useState("");
  const [pinVersion, setPinVersion] = useState("");
  const teams = useQuery({ queryKey: ["teams", user?.id], queryFn: () => list(), enabled: !!user });
  const active = selected || teams.data?.teams[0]?.id || "";
  const detail = useQuery({
    queryKey: ["team", user?.id, active],
    queryFn: () => get({ data: { workspace_id: active } }),
    enabled: !!user && !!active,
  });
  const myRole = detail.data?.members.find((m) => m.user_id === user?.id)?.role;
  const mutation = useMutation({
    mutationFn: (data: TeamAction) => manage({ data }),
    onSuccess: (r, action) => {
      if (action.action === "accept") void navigate({ search: {}, replace: true });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team"] });
      if (r.workspace_id) setSelected(r.workspace_id);
      if (r.token) setInviteLink(`${window.location.origin}/account/teams?invite=${r.token}`);
      toast.success("Workspace updated");
    },
    onError: (e) => toast.error(e.message),
  });
  async function exportSkill(id: string) {
    try {
      const row = await download({ data: { id } });
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const [path, body] of Object.entries(row.files)) zip.file(`${row.slug}/${path}`, body);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.slug}-${row.version}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }
  return (
    <SitePage>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-12">
        <div>
          <p className="font-mono text-xs uppercase text-primary">Shared knowledge</p>
          <h1 className="mt-2 text-3xl font-semibold">Team workspaces</h1>
          <p className="mt-3 text-muted-foreground">
            Private, versioned skills and a shared library of approved catalog packages. Invite
            teammates by copying a link; invitations expire after seven days.
          </p>
        </div>
        {!user ? (
          <p>
            <Link
              to="/login"
              search={{
                next: `/account/teams${search.invite ? `?invite=${encodeURIComponent(search.invite)}` : ""}`,
              }}
              className="underline"
            >
              Sign in to manage your team
            </Link>
          </p>
        ) : (
          <>
            {search.invite && (
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Workspace invitation</h2>
                <p className="my-3">Sign in with the email the invitation was created for.</p>
                <Button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ action: "accept", token: search.invite! })}
                >
                  Accept invitation
                </Button>
              </section>
            )}
            <form
              className="flex flex-wrap gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ action: "create", name });
              }}
            >
              <Input
                aria-label="New workspace name"
                placeholder="Workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-sm"
                required
                minLength={2}
              />
              <Button disabled={mutation.isPending}>Create workspace</Button>
            </form>
            {teams.isPending && <p>Loading workspaces…</p>}
            {teams.error && <p role="alert">{teams.error.message}</p>}
            {!!teams.data?.teams.length && (
              <label className="block">
                Workspace
                <select
                  className="mt-2 block rounded border bg-background p-2"
                  value={active}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setInviteLink("");
                  }}
                >
                  {teams.data.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {detail.error && <p role="alert">{detail.error.message}</p>}
            {detail.data && (
              <>
                <section className="rounded-xl border p-5">
                  <h2 className="text-xl font-semibold">Members · {myRole}</h2>
                  <ul className="my-4 space-y-3">
                    {detail.data.members.map((m) => (
                      <li key={m.user_id} className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs">
                          {m.user_id === user.id ? "You" : m.user_id}
                        </span>
                        <span>{m.role}</span>
                        {myRole === "admin" && m.user_id !== user.id && (
                          <>
                            <select
                              aria-label={`Role for ${m.user_id}`}
                              className="rounded border bg-background p-1"
                              value={m.role}
                              disabled={mutation.isPending}
                              onChange={(e) =>
                                mutation.mutate({
                                  action: "set_role",
                                  workspace_id: active,
                                  user_id: m.user_id,
                                  role: e.target.value as "viewer" | "editor" | "admin",
                                })
                              }
                            >
                              {["viewer", "editor", "admin"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({
                                  action: "remove_member",
                                  workspace_id: active,
                                  user_id: m.user_id,
                                })
                              }
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {myRole === "admin" && (
                    <form
                      className="flex flex-wrap gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate({ action: "invite", workspace_id: active, email, role });
                      }}
                    >
                      <Input
                        aria-label="Invite email"
                        type="email"
                        required
                        placeholder="teammate@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="max-w-sm"
                      />
                      <select
                        aria-label="Invite role"
                        className="rounded border bg-background p-2"
                        value={role}
                        onChange={(e) => setRole(e.target.value as typeof role)}
                      >
                        {["viewer", "editor", "admin"].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <Button disabled={mutation.isPending}>Create invite link</Button>
                    </form>
                  )}
                  {inviteLink && (
                    <div className="mt-3">
                      <p>Copy this link now. The token is only shown once.</p>
                      <Input aria-label="Invitation link" readOnly value={inviteLink} />
                      <Button
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(inviteLink)}
                      >
                        Copy invite
                      </Button>
                    </div>
                  )}
                </section>
                <section className="rounded-xl border p-5">
                  <h2 className="text-xl font-semibold">Private skill versions</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Each version is immutable. A different administrator must approve a submission.
                    Team approval is an internal decision, not public certification.
                  </p>
                  <ul className="my-4 space-y-3">
                    {detail.data.skills.map((s) => (
                      <li key={s.id} className="rounded border p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <strong>{s.name}</strong>
                          <span>
                            {s.version} · {s.status}
                          </span>
                          <Button variant="outline" onClick={() => exportSkill(s.id)}>
                            Download bundle
                          </Button>
                          {myRole === "admin" &&
                            s.status === "pending" &&
                            s.created_by !== user.id && (
                              <>
                                <Button
                                  disabled={mutation.isPending}
                                  onClick={() =>
                                    mutation.mutate({
                                      action: "review_skill",
                                      workspace_id: active,
                                      id: s.id,
                                      status: "approved",
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  disabled={mutation.isPending}
                                  onClick={() =>
                                    mutation.mutate({
                                      action: "review_skill",
                                      workspace_id: active,
                                      id: s.id,
                                      status: "rejected",
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                        </div>
                        <p className="mt-2 text-sm">{s.description}</p>
                      </li>
                    ))}
                  </ul>
                  {myRole !== "viewer" && (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        try {
                          mutation.mutate({
                            action: "submit_skill",
                            workspace_id: active,
                            slug,
                            version,
                            name: skillName,
                            description,
                            files: { ...parseExtras(extras), "SKILL.md": content },
                          });
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Invalid auxiliary files",
                          );
                        }
                      }}
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Input
                          aria-label="Skill slug"
                          placeholder="skill-slug"
                          value={slug}
                          onChange={(e) => {
                            setSlug(e.target.value);
                            setContent((c) => c.replace(/^name:.*$/m, `name: ${e.target.value}`));
                          }}
                          required
                        />
                        <Input
                          aria-label="Skill name"
                          placeholder="Skill name"
                          value={skillName}
                          onChange={(e) => setSkillName(e.target.value)}
                          required
                        />
                        <Input
                          aria-label="Skill version"
                          placeholder="0.1.0"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        aria-label="Skill description"
                        placeholder="What this skill does"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <Textarea
                        aria-label="Skill instructions"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={9}
                      />
                      <Textarea
                        aria-label="Auxiliary files JSON"
                        placeholder={
                          'Optional auxiliary UTF-8 files: {"references/policy.md":"...", "scripts/check.py":"..."}'
                        }
                        value={extras}
                        onChange={(e) => setExtras(e.target.value)}
                        rows={3}
                      />
                      <Button disabled={mutation.isPending}>Submit for independent review</Button>
                    </form>
                  )}
                </section>
                <section className="rounded-xl border p-5">
                  <h2 className="text-xl font-semibold">Pinned catalog library</h2>
                  <ul className="my-4 space-y-3">
                    {detail.data.pins.map((p) => (
                      <li key={p.package_id} className="flex flex-wrap items-center gap-3">
                        <span>
                          {p.package?.name ?? "Unavailable package"} ·{" "}
                          {p.version ?? "Unavailable version"}
                        </span>
                        {p.package && (
                          <Link
                            to="/marketplace/$packageId"
                            params={{ packageId: p.package.slug }}
                            className="underline"
                          >
                            View package
                          </Link>
                        )}
                        {p.package && (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const r = await downloadPin({
                                  data: { workspace_id: active, package_id: p.package_id },
                                });
                                const bytes = Uint8Array.from(atob(r.base64), (c) =>
                                  c.charCodeAt(0),
                                );
                                const url = URL.createObjectURL(
                                  new Blob([bytes], { type: "application/zip" }),
                                );
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = r.filename;
                                a.click();
                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : "Download failed",
                                );
                              }
                            }}
                          >
                            Download pinned version
                          </Button>
                        )}
                        {myRole === "admin" && (
                          <Button
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                action: "unpin_package",
                                workspace_id: active,
                                package_id: p.package_id,
                              })
                            }
                          >
                            Unpin
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {myRole === "admin" && (
                    <form
                      className="flex flex-wrap gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate({
                          action: "pin_package",
                          workspace_id: active,
                          slug: pinSlug,
                          version: pinVersion,
                        });
                      }}
                    >
                      <Input
                        className="max-w-xs"
                        aria-label="Catalog slug"
                        placeholder="Catalog slug"
                        value={pinSlug}
                        onChange={(e) => setPinSlug(e.target.value)}
                        required
                      />
                      <Input
                        className="max-w-xs"
                        aria-label="Catalog version"
                        placeholder="Approved version"
                        value={pinVersion}
                        onChange={(e) => setPinVersion(e.target.value)}
                        required
                      />
                      <Button disabled={mutation.isPending}>Pin version</Button>
                    </form>
                  )}
                </section>
                {myRole === "admin" && (
                  <section className="rounded-xl border p-5">
                    <h2 className="text-xl font-semibold">Audit trail</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                      {detail.data.audit.map((a) => (
                        <li key={a.id}>
                          {new Date(a.created_at).toLocaleString()} · {a.action} · {a.actor_id}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </SitePage>
  );
}

function parseExtras(text: string): Record<string, string> {
  if (!text.trim()) return {};
  const value: unknown = JSON.parse(text);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.values(value).some((v) => typeof v !== "string")
  )
    throw new Error("Auxiliary files must be a JSON object mapping paths to UTF-8 text");
  return value as Record<string, string>;
}
