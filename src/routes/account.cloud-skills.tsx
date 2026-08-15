import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SitePage } from "@/components/site/SitePage";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import {
  listCloudSkills,
  createCloudSkill,
  updateCloudSkill,
  deleteCloudSkill,
  exportCloudSkill,
  importCloudSkill,
  getCloudSkill,
} from "@/lib/cloud-skills/cloud-skills.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyncAnywhere } from "@/components/cloud-skills/SyncAnywhere";
import { ExportBundle } from "@/components/cloud-skills/ExportBundle";

export const Route = createFileRoute("/account/cloud-skills")({
  head: () => ({
    meta: [
      { title: "Cloud Skill Manager — Super Agent Skill" },
      {
        name: "description",
        content:
          "Save, sync and reuse your AI skills across projects, CLIs and devices. Premium feature.",
      },
    ],
  }),
  component: CloudSkillsPage,
});

type CloudSkill = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  is_public: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

function CloudSkillsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const qc = useQueryClient();

  const listFn = useServerFn(listCloudSkills);
  const createFn = useServerFn(createCloudSkill);
  const updateFn = useServerFn(updateCloudSkill);
  const deleteFn = useServerFn(deleteCloudSkill);
  const exportFn = useServerFn(exportCloudSkill);
  const importFn = useServerFn(importCloudSkill);
  const getFn = useServerFn(getCloudSkill);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<CloudSkill | null>(null);
  const [editing, setEditing] = useState<CloudSkill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CloudSkill | null>(null);

  // Create form state
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newTags, setNewTags] = useState("");
  const [newContent, setNewContent] = useState("");

  // Import state
  const [importContent, setImportContent] = useState("");
  const [importFilename, setImportFilename] = useState("");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editChangelog, setEditChangelog] = useState("");

  const q = useQuery({
    queryKey: ["cloud-skills", search, category],
    queryFn: () =>
      listFn({
        data: {
          query: search || undefined,
          category: category || undefined,
          limit: 50,
          offset: 0,
          include_public: false,
        },
      }),
    enabled: !!user && isActive,
  });

  const createMut = useMutation({
    mutationFn: (input: any) => createFn({ data: input }),
    onSuccess: () => {
      toast.success("Skill saved to cloud");
      qc.invalidateQueries({ queryKey: ["cloud-skills"] });
      setShowCreate(false);
      resetCreateForm();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create skill"),
  });

  const importMut = useMutation({
    mutationFn: (input: { filename: string; content: string }) =>
      importFn({ data: input }),
    onSuccess: (r: any) => {
      toast.success(`Imported as "${r.skill.slug}"`);
      qc.invalidateQueries({ queryKey: ["cloud-skills"] });
      setShowImport(false);
      setImportContent("");
      setImportFilename("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  const updateMut = useMutation({
    mutationFn: (input: any) => updateFn({ data: input }),
    onSuccess: (r: any) => {
      toast.success(r.version_bumped ? "Updated (new version)" : "Updated");
      qc.invalidateQueries({ queryKey: ["cloud-skills"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Skill deleted");
      qc.invalidateQueries({ queryKey: ["cloud-skills"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  function resetCreateForm() {
    setNewSlug("");
    setNewName("");
    setNewDesc("");
    setNewCategory("general");
    setNewTags("");
    setNewContent("");
  }

  async function handleExport(skill: CloudSkill) {
    try {
      const result = await exportFn({ data: { id: skill.id, format: "markdown" } });
      await navigator.clipboard.writeText(typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2));
      toast.success("Copied to clipboard as SKILL.md");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    }
  }

  async function openEdit(skill: CloudSkill) {
    try {
      const result = await getFn({ data: { id: skill.id } });
      setEditing(skill);
      setEditName(result.skill.name);
      setEditDesc(result.skill.description ?? "");
      setEditContent(result.skill.content);
      setEditCategory(result.skill.category);
      setEditTags(result.skill.tags?.join(", ") ?? "");
      setEditChangelog("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load skill");
    }
  }

  if (authLoading || subLoading) {
    return (
      <SitePage>
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </main>
      </SitePage>
    );
  }

  if (!user) {
    return (
      <SitePage>
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
          <h1 className="text-3xl font-semibold tracking-tight">Cloud Skill Manager</h1>
          <p className="mt-4 text-muted-foreground">
            Sign in to manage your cloud skills.{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </main>
      </SitePage>
    );
  }

  if (!isActive) {
    return (
      <SitePage>
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Premium Feature
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Cloud Skill Manager
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Save, sync and reuse your AI skills across projects, CLIs and devices.
            Cloud Skill Manager is available on <strong>Agent Pass</strong> and{" "}
            <strong>Enterprise</strong> plans.
          </p>
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">What you get</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Private, per-account storage — never shared with other users</li>
              <li>One-call sync into Hermes, Claude Code, Codex, Cursor, Lovable, OpenClaw and 9 more tools</li>
              <li>Version history with changelog for every update</li>
              <li>Import/export in SKILL.md format (compatible with 60+ agents)</li>
              <li>Template variables for reusable, customizable skills</li>
              <li>Fork public skills into your library</li>
              <li>Full MCP API access from any CLI (Claude, Cursor, Codex...)</li>
            </ul>
            <div className="mt-6">
              <Link to="/pricing">
                <Button>View plans</Button>
              </Link>
            </div>
          </div>
        </main>
      </SitePage>
    );
  }

  const skills = (q.data?.skills ?? []) as CloudSkill[];

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Account
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Cloud Skill Manager
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your personal cloud library. Save skills here and reuse them in any
          project, on any device, from any CLI.
        </p>

        {/* Actions bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={() => setShowImport(true)}>
            Import
          </Button>
          <Button onClick={() => setShowCreate(true)}>New skill</Button>
        </div>

        <SyncAnywhere sampleSlug={skills[0]?.slug ?? "my-skill"} />

        <div className="mt-6">
          <PendingConflicts />
        </div>

        <ExportBundle skills={skills.map((s) => ({ id: s.id, slug: s.slug, name: s.name }))} />


        {/* Skills list */}
        <div className="mt-8 rounded-2xl border border-border bg-surface">
          <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Your cloud skills
            {q.data && (
              <span className="ml-2 text-foreground">{q.data.total}</span>
            )}
          </div>

          {q.isLoading && (
            <div className="p-5 text-sm text-muted-foreground">Loading...</div>
          )}

          {q.isError && (
            <div className="p-5 text-sm text-destructive">
              Failed to load skills. Try refreshing.
            </div>
          )}

          {skills.length === 0 && !q.isLoading && (
            <div className="p-5 text-sm text-muted-foreground">
              No skills yet. Create one or import from a SKILL.md file.
            </div>
          )}

          {skills.length > 0 && (
            <ul className="divide-y divide-border/60">
              {skills.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <Badge variant="secondary">{s.category}</Badge>
                      {s.is_public && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400">
                          Public
                        </Badge>
                      )}
                      <Badge variant="outline">v{s.version}</Badge>
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {s.slug}
                    </div>
                    {s.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    {s.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleExport(s)}>
                      Export
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Cloud skills are also accessible via the MCP API. Use{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            cloud_skills_save
          </code>{" "}
          from Claude Code, Cursor, Codex or any MCP-compatible agent to push
          skills directly from your terminal.
        </p>
      </main>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New cloud skill</DialogTitle>
            <DialogDescription>
              Create a new skill in your cloud library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="my-skill"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Skill"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                placeholder="What this skill does"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="general"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="coding, review"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="The skill content (Markdown)..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newSlug || !newName || !newContent || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  slug: newSlug,
                  name: newName,
                  description: newDesc || undefined,
                  category: newCategory || "general",
                  tags: newTags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                  content: newContent,
                  variables: {},
                  is_public: false,
                })
              }
            >
              {createMut.isPending ? "Saving..." : "Save to cloud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import skill</DialogTitle>
            <DialogDescription>
              Paste a SKILL.md file (Markdown with optional YAML frontmatter).
              Name, category and tags are auto-detected from frontmatter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-filename">Filename</Label>
              <Input
                id="import-filename"
                placeholder="my-skill.md"
                value={importFilename}
                onChange={(e) => setImportFilename(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-content">Content</Label>
              <Textarea
                id="import-content"
                placeholder={"---\nname: My Skill\ncategory: coding\ntags: review, quality\n---\n\nYour skill content here..."}
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
            <Button
              disabled={!importFilename || !importContent || importMut.isPending}
              onClick={() =>
                importMut.mutate({
                  filename: importFilename,
                  content: importContent,
                })
              }
            >
              {importMut.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit: {editing?.slug}</DialogTitle>
            <DialogDescription>
              Changing the content creates a new version automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Changelog (optional)</Label>
              <Input
                value={editChangelog}
                onChange={(e) => setEditChangelog(e.target.value)}
                placeholder="What changed in this version"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editName || !editContent || updateMut.isPending}
              onClick={() => {
                if (!editing) return;
                updateMut.mutate({
                  id: editing.id,
                  name: editName,
                  description: editDesc || undefined,
                  category: editCategory || undefined,
                  tags: editTags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                  content: editContent,
                  changelog: editChangelog || undefined,
                });
              }}
            >
              {updateMut.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete skill?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.name}</strong> and all its version history.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMut.mutate(deleteTarget.id);
              }}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SitePage>
  );
}
