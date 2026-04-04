"use client";

import {
  CreateTemplateRequestSchema,
  type TemplateCategory,
  type TemplateSummary,
} from "@ac2/contracts";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArchiveIcon,
  ArrowRightIcon,
  CopyIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";

interface TemplateDashboardProps {
  user: {
    email: string;
    plan: "free" | "pro";
    mfaEnabled: boolean;
  };
  initialTemplates: TemplateSummary[];
}

type TemplateFilter = "all" | TemplateSummary["status"];

type CreateDialogState = {
  values: {
    name: string;
    description: string;
    category: TemplateCategory;
    width: string;
    height: string;
  };
  errors?: Record<string, string[] | undefined>;
};

const FILTERS: TemplateFilter[] = ["all", "draft", "review", "live", "archived"];

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  social: "Social",
  email: "Email",
  ad: "Ad",
  product: "Product",
};

const STATUS_LABELS: Record<TemplateSummary["status"], string> = {
  draft: "Draft",
  review: "In review",
  live: "Live",
  archived: "Archived",
};

const INITIAL_DIALOG_STATE: CreateDialogState = {
  values: {
    name: "",
    description: "",
    category: "social",
    width: "1080",
    height: "1350",
  },
};

const statusBadgeClasses: Record<TemplateSummary["status"], string> = {
  draft: "bg-secondary text-secondary-foreground",
  review: "bg-accent text-accent-foreground",
  live: "bg-primary text-primary-foreground",
  archived: "bg-muted text-muted-foreground",
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const createTemplateId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}`;

export function TemplateDashboard({
  user,
  initialTemplates,
}: TemplateDashboardProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dialogState, setDialogState] = useState(INITIAL_DIALOG_STATE);
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const searchTerm = deferredQuery.trim().toLowerCase();

  const visibleTemplates = templates.filter((template) => {
    const matchesFilter = filter === "all" ? true : template.status === filter;
    const matchesSearch =
      searchTerm.length === 0
        ? true
        : [
            template.name,
            template.description,
            template.workspaceName,
            template.lastEditedBy,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    visibleTemplates[0] ??
    null;

  const liveCount = templates.filter((template) => template.status === "live").length;
  const reviewCount = templates.filter((template) => template.status === "review").length;
  const totalUsage = templates.reduce((sum, template) => sum + template.usageCount, 0);

  const upsertTemplates = (updater: (current: TemplateSummary[]) => TemplateSummary[]) => {
    startTransition(() => {
      setTemplates((current) => {
        const nextTemplates = updater(current);
        return [...nextTemplates].sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );
      });
    });
  };

  const handleArchive = () => {
    if (!selectedTemplate) {
      return;
    }

    upsertTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              status: "archived",
              updatedAt: new Date().toISOString(),
            }
          : template,
      ),
    );
  };

  const handlePromote = () => {
    if (!selectedTemplate) {
      return;
    }

    const nextStatus = selectedTemplate.status === "draft" ? "review" : "live";

    upsertTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              status: nextStatus,
              updatedAt: new Date().toISOString(),
            }
          : template,
      ),
    );
  };

  const handleDuplicate = () => {
    if (!selectedTemplate) {
      return;
    }

    const duplicatedTemplate: TemplateSummary = {
      ...selectedTemplate,
      id: createTemplateId(),
      name: `${selectedTemplate.name} Copy`,
      status: "draft",
      version: 1,
      usageCount: 0,
      updatedAt: new Date().toISOString(),
      lastEditedBy: user.email,
    };

    setSelectedTemplateId(duplicatedTemplate.id);
    upsertTemplates((current) => [duplicatedTemplate, ...current]);
  };

  const handleCreateTemplate = (formData: FormData) => {
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category: String(formData.get("category") ?? "social") as TemplateCategory,
      width: Number(formData.get("width") ?? 0),
      height: Number(formData.get("height") ?? 0),
    };

    const parsed = CreateTemplateRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setDialogState({
        values: {
          name: payload.name,
          description: payload.description,
          category: payload.category,
          width: String(formData.get("width") ?? ""),
          height: String(formData.get("height") ?? ""),
        },
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const nextTemplate: TemplateSummary = {
      ...parsed.data,
      id: createTemplateId(),
      status: "draft",
      workspaceName: "Growth Studio",
      lastEditedBy: user.email,
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      version: 1,
    };

    setIsCreateOpen(false);
    setDialogState(INITIAL_DIALOG_STATE);
    setFilter("all");
    setQuery("");
    setSelectedTemplateId(nextTemplate.id);
    upsertTemplates((current) => [nextTemplate, ...current]);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col justify-between border-b border-border/70 bg-sidebar/80 px-6 py-6 backdrop-blur lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-primary text-primary-foreground">
                AC
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">AC2 Studio</p>
                <p className="text-sm text-muted-foreground">Template operations</p>
              </div>
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-sidebar-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Current plan
              </p>
              <p className="mt-3 text-lg font-semibold capitalize text-foreground">
                {user.plan}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {user.mfaEnabled
                  ? "MFA protected access is enabled for this account."
                  : "Password-only access. You can enable MFA on your next registration flow."}
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { label: "Templates", active: true },
              { label: "Generations", active: false },
              { label: "Assets", active: false },
              { label: "Workspaces", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "rounded-[1.25rem] px-4 py-3 text-sm font-medium",
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-sidebar-border/70 bg-background/70 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Session-backed dashboard access
            </p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full justify-center">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="px-6 py-6 sm:px-8 lg:px-10">
        <header className="rounded-[2rem] border border-border/70 bg-background/80 p-6 shadow-[0_24px_80px_rgba(36,27,18,0.06)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Dashboard
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Templates that are ready for design, review, and launch.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                The template surface is live now. Use it to shape the workflow and then wire the same contracts into the backend template module when that service lands.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="lg" onClick={() => setFilter("review")}>
                Review queue
              </Button>
              <Button size="lg" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                New template
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-border/70 pt-6 sm:grid-cols-3">
            <Metric label="Live templates" value={String(liveCount).padStart(2, "0")} />
            <Metric label="Awaiting review" value={String(reviewCount).padStart(2, "0")} />
            <Metric label="Total launches" value={totalUsage.toString()} />
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <section className="rounded-[2rem] border border-border/70 bg-background/86 p-6 shadow-[0_24px_80px_rgba(36,27,18,0.05)] backdrop-blur">
            <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search templates, owners, or workspaces"
                  className="h-11 rounded-[1.25rem] bg-secondary/70 pl-11"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      filter === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent",
                    )}
                  >
                    {value === "all" ? "All" : STATUS_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {visibleTemplates.length > 0 ? (
                visibleTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cn(
                      "flex w-full flex-col gap-4 rounded-[1.75rem] border px-5 py-5 text-left transition-colors",
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/8"
                        : "border-border bg-background/80 hover:bg-secondary/60",
                    )}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-foreground">
                            {template.name}
                          </span>
                          <StatusBadge status={template.status} />
                        </div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Updated {formatDate(template.updatedAt)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{CATEGORY_LABELS[template.category]}</span>
                      <span>
                        {template.width} × {template.height}
                      </span>
                      <span>{template.workspaceName}</span>
                      <span>v{template.version}</span>
                      <span>{template.usageCount} launches</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-secondary/40 px-6 text-center">
                  <LayersIcon className="text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">
                    No templates match this view.
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Clear the search or create a fresh template to seed a new workflow lane.
                  </p>
                  <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>
                    <PlusIcon data-icon="inline-start" />
                    Create template
                  </Button>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-[2rem] border border-border/70 bg-background/86 p-6 shadow-[0_24px_80px_rgba(36,27,18,0.05)] backdrop-blur">
            {selectedTemplate ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
                    Selected
                  </p>
                  <StatusBadge status={selectedTemplate.status} />
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-border/70 bg-secondary/40 p-5">
                  <p className="text-lg font-semibold text-foreground">{selectedTemplate.name}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                    <SparklesIcon />
                    {CATEGORY_LABELS[selectedTemplate.category]} format
                  </div>
                  <div className="mt-5 rounded-[1.5rem] bg-background/90 p-4">
                    <div className="aspect-[4/3] rounded-[1.25rem] border border-dashed border-border bg-[linear-gradient(135deg,rgba(196,116,59,0.14),rgba(196,116,59,0.04))] p-4">
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            Preview placeholder
                          </p>
                          <p className="mt-3 max-w-[14rem] text-xl font-semibold tracking-tight text-foreground">
                            {selectedTemplate.name}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedTemplate.width} × {selectedTemplate.height}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button onClick={handlePromote}>
                    <ArrowRightIcon data-icon="inline-start" />
                    {selectedTemplate.status === "draft"
                      ? "Move to review"
                      : "Mark live"}
                  </Button>
                  <Button variant="outline" onClick={handleDuplicate}>
                    <CopyIcon data-icon="inline-start" />
                    Duplicate
                  </Button>
                  <Button variant="outline" onClick={handleArchive}>
                    <ArchiveIcon data-icon="inline-start" />
                    Archive
                  </Button>
                </div>

                <div className="mt-6 border-t border-border/70 pt-6">
                  <dl className="grid gap-4 text-sm">
                    <InfoRow label="Workspace" value={selectedTemplate.workspaceName} />
                    <InfoRow label="Owner" value={selectedTemplate.lastEditedBy} />
                    <InfoRow label="Updated" value={formatDate(selectedTemplate.updatedAt)} />
                    <InfoRow label="Version" value={`v${selectedTemplate.version}`} />
                    <InfoRow label="Launches" value={selectedTemplate.usageCount.toString()} />
                  </dl>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
                <p className="text-lg font-semibold text-foreground">Select a template</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Choose any template from the list to inspect its metadata and run management actions.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a new template</DialogTitle>
            <DialogDescription>
              Start with a reusable frame for campaigns, product shots, lifecycle email, or social drops.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateTemplate(new FormData(event.currentTarget));
            }}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="template-name" className="text-sm font-medium text-foreground">
                Template name
              </label>
              <Input
                id="template-name"
                name="name"
                defaultValue={dialogState.values.name}
                className="h-11 rounded-[1.25rem] bg-secondary/70"
                aria-invalid={Boolean(dialogState.errors?.name?.[0])}
                required
              />
              {dialogState.errors?.name?.[0] && (
                <p className="text-sm text-destructive">{dialogState.errors.name[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="template-description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="template-description"
                name="description"
                defaultValue={dialogState.values.description}
                rows={3}
                className="min-h-24 rounded-[1.25rem] border border-transparent bg-input/50 px-3 py-3 text-sm text-foreground outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
              {dialogState.errors?.description?.[0] && (
                <p className="text-sm text-destructive">{dialogState.errors.description[0]}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="template-category" className="text-sm font-medium text-foreground">
                  Category
                </label>
                <select
                  id="template-category"
                  name="category"
                  defaultValue={dialogState.values.category}
                  className="h-11 rounded-[1.25rem] border border-transparent bg-input/50 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="template-width" className="text-sm font-medium text-foreground">
                  Width
                </label>
                <Input
                  id="template-width"
                  name="width"
                  type="number"
                  min={320}
                  max={4096}
                  defaultValue={dialogState.values.width}
                  className="h-11 rounded-[1.25rem] bg-secondary/70"
                  aria-invalid={Boolean(dialogState.errors?.width?.[0])}
                />
                {dialogState.errors?.width?.[0] && (
                  <p className="text-sm text-destructive">{dialogState.errors.width[0]}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="template-height" className="text-sm font-medium text-foreground">
                  Height
                </label>
                <Input
                  id="template-height"
                  name="height"
                  type="number"
                  min={320}
                  max={4096}
                  defaultValue={dialogState.values.height}
                  className="h-11 rounded-[1.25rem] bg-secondary/70"
                  aria-invalid={Boolean(dialogState.errors?.height?.[0])}
                />
                {dialogState.errors?.height?.[0] && (
                  <p className="text-sm text-destructive">{dialogState.errors.height[0]}</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <PlusIcon data-icon="inline-start" />
                Create template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-secondary/50 px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TemplateSummary["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        statusBadgeClasses[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] bg-secondary/40 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
