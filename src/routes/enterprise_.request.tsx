import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitEnterpriseRequest } from "@/lib/enterprise/requests.functions";

export const Route = createFileRoute("/enterprise_/request")({
  component: EnterpriseRequestPage,
  head: () => ({
    meta: [
      { title: "Request Enterprise access (NDA) · Super Agent Skill" },
      {
        name: "description",
        content:
          "Start an Enterprise engagement under mutual NDA: review the IP requirements checklist, confirm ownership and no-training terms, and get a private registry walkthrough.",
      },
      { property: "og:title", content: "Request Enterprise access under NDA" },
      {
        property: "og:description",
        content:
          "Mutual NDA, IP requirements checklist and a private registry review before you integrate a proprietary skill.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ChecklistItem = { key: string; label: string; detail: string; required?: boolean };

const IP_CHECKLIST: ChecklistItem[] = [
  {
    key: "ownership_retained",
    label: "I retain full ownership of my skill and its content",
    detail:
      "You keep all IP. Uploading grants us only the narrow licence needed to store, evaluate and (if you choose) distribute the version you publish.",
    required: true,
  },
  {
    key: "no_training",
    label: "My content is never used to train or fine-tune models",
    detail:
      "No training, no fine-tuning, no embedding into other packages. Evaluation runs are execution-only and scoped to your package.",
    required: true,
  },
  {
    key: "private_registry",
    label: "My skill stays in a private registry (not listed publicly)",
    detail:
      "Private packages are invisible in the marketplace, search, sitemap and API. Only members of your org can resolve them.",
  },
  {
    key: "no_human_review",
    label: "No human may read the source without my written approval",
    detail:
      "Reviews run automated by default. Human review of private content only happens on your explicit, per-request approval.",
  },
  {
    key: "signed_releases",
    label: "Every release must be Ed25519-signed and offline-verifiable",
    detail:
      "Each version is signed against its SHA-256 content hash. Verify without trusting our endpoints.",
  },
  {
    key: "audit_trail",
    label: "I need an exportable audit trail of every access and evaluation",
    detail: "Who accessed what, when, and which pipeline touched it — exportable as JSON/CSV.",
  },
  {
    key: "deletion_sla",
    label: "I need hard-deletion on request, with a written SLA",
    detail:
      "On request we purge content, artifacts and derived evaluation payloads, and confirm in writing.",
  },
  {
    key: "residency",
    label: "I have data residency or sub-processor restrictions",
    detail: "Tell us the constraints below and we confirm feasibility before you upload anything.",
  },
  {
    key: "dpa_required",
    label: "I need a DPA / security questionnaire completed",
    detail: "We complete your questionnaire and counter-sign your DPA before onboarding.",
  },
];

const NDA_TERMS = [
  "Mutual: both sides protect the other's confidential information — your skill content, prompts, evaluation results and business context; our non-public pipeline and scoring internals.",
  "Purpose limitation: your material may only be used to evaluate, score and (where you ask for it) host and distribute your package. No other use.",
  "No training: your content is never used to train, fine-tune or distil any model, and never merged into another package.",
  "Need-to-know: access limited to personnel required for the engagement, each bound by equivalent confidentiality obligations.",
  "Term: obligations survive 3 years after the engagement ends; trade secrets remain protected for as long as they qualify.",
  "Return / destruction: on written request we delete or return your material and confirm completion in writing.",
];

function EnterpriseRequestPage() {
  const submit = useServerFn(submitEnterpriseRequest);
  const [checked, setChecked] = useState<Record<string, boolean>>({
    ownership_retained: true,
    no_training: true,
  });
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    work_email: "",
    role: "",
    team_size: "",
    use_case: "",
    ip_concerns: "",
    nda_signer_name: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          ...form,
          role: form.role || undefined,
          team_size: form.team_size || undefined,
          ip_concerns: form.ip_concerns || undefined,
          nda_required: true,
          nda_accepted: true as const,
          checklist: checked,
        },
      }),
  });

  const requiredMissing = useMemo(
    () => IP_CHECKLIST.filter((i) => i.required && !checked[i.key]).map((i) => i.label),
    [checked],
  );

  const canSubmit =
    ndaAccepted &&
    requiredMissing.length === 0 &&
    form.company.trim().length >= 2 &&
    form.contact_name.trim().length >= 2 &&
    /.+@.+\..+/.test(form.work_email) &&
    form.use_case.trim().length >= 10 &&
    form.nda_signer_name.trim().length >= 2 &&
    !mutation.isPending;

  const selectedCount = IP_CHECKLIST.filter((i) => checked[i.key]).length;

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto max-w-2xl px-6 py-24">
          <div className="rounded-lg border border-border bg-surface p-8">
            <div className="font-mono text-xs uppercase tracking-wider text-primary">
              Request received
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Your NDA-backed request is logged.
            </h1>
            <p className="mt-4 text-muted-foreground">
              We recorded your NDA acceptance and the {selectedCount} IP requirements you selected.
              A countersigned mutual NDA and answers to each requirement come back to{" "}
              <span className="font-medium text-foreground">{form.work_email}</span> within one
              business day. Nothing needs to be uploaded until you have that in writing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/security"
                className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:border-primary/40"
              >
                Verify our security evidence
              </Link>
              <Link
                to="/whitepaper"
                className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:border-primary/40"
              >
                Read the whitepaper
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-12">
        <header className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Enterprise intake · under NDA
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Get the terms in writing before you upload anything.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Accept the mutual NDA, tick the IP requirements that matter to you, and we come back
            with a countersigned NDA plus a written answer per requirement. No skill content is
            requested at this step.
          </p>
        </header>

        {/* NDA */}
        <section className="mt-12 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold tracking-tight">Mutual NDA — key terms</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Plain-language summary of the agreement we countersign. The executable document is
            attached to our reply.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {NDA_TERMS.map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-4">
            <Checkbox
              checked={ndaAccepted}
              onCheckedChange={(v) => setNdaAccepted(v === true)}
              className="mt-0.5"
              aria-label="Accept the mutual NDA terms"
            />
            <span className="text-sm">
              I accept these mutual NDA terms on behalf of my organization, and understand
              acceptance is recorded with a timestamp.
            </span>
          </label>
        </section>

        {/* Checklist */}
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">IP requirements checklist</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each ticked item becomes a written commitment in our reply.
              </p>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {selectedCount}/{IP_CHECKLIST.length} selected
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {IP_CHECKLIST.map((item) => {
              const on = !!checked[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    on ? "border-primary/50 bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) =>
                      setChecked((prev) => ({ ...prev, [item.key]: v === true }))
                    }
                    className="mt-0.5"
                    aria-label={item.label}
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {item.label}
                      {item.required && (
                        <span className="ml-2 font-mono text-[10px] uppercase text-primary">
                          required
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {requiredMissing.length > 0 && (
            <p className="mt-3 text-xs text-destructive">
              Confirm the required items to continue: {requiredMissing.join("; ")}.
            </p>
          )}
        </section>

        {/* Form */}
        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold tracking-tight">Your details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Company" required>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="Your name" required>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Work email" required>
              <Input
                type="email"
                value={form.work_email}
                onChange={(e) => setForm({ ...form, work_email: e.target.value })}
                placeholder="jane@acme.com"
              />
            </Field>
            <Field label="Role">
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Head of Platform / CISO"
              />
            </Field>
            <Field label="Team size">
              <Input
                value={form.team_size}
                onChange={(e) => setForm({ ...form, team_size: e.target.value })}
                placeholder="1-10 / 11-50 / 50+"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="What do you want to integrate?" required>
                <Textarea
                  rows={4}
                  value={form.use_case}
                  onChange={(e) => setForm({ ...form, use_case: e.target.value })}
                  placeholder="Proprietary skills, agents involved, environments, timeline. No secrets or skill content needed here."
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="IP, residency or legal constraints we must respect">
                <Textarea
                  rows={3}
                  value={form.ip_concerns}
                  onChange={(e) => setForm({ ...form, ip_concerns: e.target.value })}
                  placeholder="e.g. EU-only processing, no sub-processors outside the EEA, our own DPA template."
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Signing on behalf of (full legal name)" required>
                <Input
                  value={form.nda_signer_name}
                  onChange={(e) => setForm({ ...form, nda_signer_name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </Field>
            </div>
          </div>

          {mutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              We could not submit your request. Try again, or email
              enterprise@superagentskill.com.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Submitting…" : "Submit request under NDA"}
            </Button>
            <span className="text-xs text-muted-foreground">
              No skill content is uploaded at this step.
            </span>
          </div>
        </section>

        <p className="mt-8 text-sm text-muted-foreground">
          Prefer to check the evidence first? See the{" "}
          <Link to="/security" className="text-primary underline-offset-4 hover:underline">
            Trust Center
          </Link>{" "}
          for the RLS model, signed release log and offline Ed25519 verification, or the{" "}
          <Link to="/enterprise" className="text-primary underline-offset-4 hover:underline">
            Enterprise overview
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}
