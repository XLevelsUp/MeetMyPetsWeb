"use client";

import { ArrowLeft, ExternalLink, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BlogActionDialog } from "@/components/blogs/blog-action-dialog";
import { BlogStatusBadge } from "@/components/blogs/blog-format";
import { FaqEditor } from "@/components/blogs/faq-editor";
import { ImageField } from "@/components/blogs/image-field";
import { RichTextEditor } from "@/components/blogs/rich-text-editor";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import {
  openPreview,
  reportRevalidation,
  uploadBlogImage,
  useBlogAction,
  useBlogCategories,
  useBlogPost,
  useCreateBlogCategory,
  useSaveBlogPost,
} from "@/hooks/use-blogs";
import { EMPTY_DOC, wordCount, type BlogDoc } from "@/lib/blog-content";
import {
  BLOG_LIMITS,
  DEFAULT_AUTHOR,
  SEO_GUIDE,
  slugify,
  type BlogAction,
  type BlogFaqItem,
  type BlogPost,
  type BlogStatus,
} from "@/lib/blog-contract";
import { cn } from "@/lib/utils";

const text = copy.blogs;
const f = text.editor.fields;

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  content: BlogDoc;
  faq: BlogFaqItem[];
  tags: string;
  authorName: string;
  categoryId: string;
  featuredImage: string | null;
  featuredImageAlt: string;
  featuredImageCaption: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string | null;
};

const NO_CATEGORY = "none";

function draftFrom(post: BlogPost | null): Draft {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: (post?.content as BlogDoc | undefined) ?? EMPTY_DOC,
    faq: post?.faq ?? [],
    tags: (post?.tags ?? []).join(", "),
    authorName: post?.authorName ?? DEFAULT_AUTHOR,
    categoryId: post?.categoryId ?? NO_CATEGORY,
    featuredImage: post?.featuredImage ?? null,
    featuredImageAlt: post?.featuredImageAlt ?? "",
    featuredImageCaption: post?.featuredImageCaption ?? "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    canonicalUrl: post?.canonicalUrl ?? "",
    ogImage: post?.ogImage ?? null,
  };
}

function toBody(draft: Draft) {
  return {
    title: draft.title,
    slug: draft.slug,
    excerpt: draft.excerpt,
    content: draft.content,
    // Half-filled FAQ rows are dropped rather than failing the save.
    faq: draft.faq.filter((item) => item.q.trim() && item.a.trim()),
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    authorName: draft.authorName.trim() || DEFAULT_AUTHOR,
    categoryId: draft.categoryId === NO_CATEGORY ? null : draft.categoryId,
    featuredImage: draft.featuredImage,
    featuredImageAlt: draft.featuredImageAlt,
    featuredImageCaption: draft.featuredImageCaption,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    canonicalUrl: draft.canonicalUrl,
    ogImage: draft.ogImage,
  };
}

function Counter({ value, max, guide }: { value: string; max: number; guide?: number }) {
  const over = guide !== undefined && value.length > guide;
  return (
    <span className={cn("text-xs tabular-nums", over ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
      {f.counter.replace("{n}", String(value.length)).replace("{max}", String(guide ?? max))}
    </span>
  );
}

function Field({
  id,
  label,
  hint,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {counter}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Entry point for both /blogs/new (`id` null) and /blogs/[id]. */
export function BlogEditor({ id }: { id: string | null }) {
  const post = useBlogPost(id);

  if (id && post.isError) {
    return <QueryErrorCard message={post.error.message} onRetry={() => post.refetch()} />;
  }
  if (id && !post.data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-[32rem] w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  // Keyed by id so a navigation between posts rebuilds the form from scratch.
  return <EditorForm key={id ?? "new"} post={post.data ?? null} />;
}

function EditorForm({ post }: { post: BlogPost | null }) {
  const router = useRouter();
  const save = useSaveBlogPost();
  const act = useBlogAction();
  const categories = useBlogCategories();
  const createCategory = useCreateBlogCategory();

  const [id, setId] = useState<string | null>(post?.id ?? null);
  const [status, setStatus] = useState<BlogStatus>(post?.status ?? "draft");
  const [slug, setSavedSlug] = useState(post?.slug ?? "");
  const [draft, setDraft] = useState<Draft>(() => draftFrom(post));
  const [saved, setSaved] = useState(() => JSON.stringify(toBody(draftFrom(post))));
  // A new article's slug follows its title until someone edits the slug.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [newCategory, setNewCategory] = useState("");
  const [pending, setPending] = useState<BlogAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(toBody(draft)) !== saved;
  const words = useMemo(() => wordCount(draft.content), [draft.content]);

  // Closing the tab with unsaved work asks first. In-app links are covered by
  // the explicit back button's confirm.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(value as string);
      return next;
    });
  }

  async function submit(intent: "save" | "publish") {
    setError(null);
    const body = toBody(draft);
    try {
      const result = await save.mutateAsync({ id, ...body, intent });
      setSaved(JSON.stringify(body));
      setStatus(result.status);
      setSavedSlug(result.slug);
      setSlugTouched(true);
      const message =
        intent === "publish" ? text.toast.published : id ? text.toast.saved : text.toast.created;
      reportRevalidation(result, message);
      if (!id) {
        setId(result.id);
        router.replace(`/blogs/${result.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save.";
      setError(message);
      // Publishing goes through the dialog, which shows the error itself.
      if (intent === "publish") throw err;
    }
  }

  async function runAction(action: BlogAction, reason: string | undefined) {
    if (action === "publish") {
      await submit("publish");
      return;
    }
    if (!id) return;
    const result = await act.mutateAsync({ id, action, reason });
    reportRevalidation(result, action === "delete" ? text.toast.deleted : text.toast.unpublished);
    if (action === "delete") {
      setSaved(JSON.stringify(toBody(draft)));
      router.push("/blogs");
      return;
    }
    setStatus(result.status);
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const category = await createCategory.mutateAsync(name);
      set("categoryId", category.id);
      setNewCategory("");
      toast.success(text.toast.categoryCreated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the category.");
    }
  }

  const busy = save.isPending || act.isPending;
  const isPublished = status === "published";
  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title, status, primary actions. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!dirty || window.confirm(text.editor.leaveWarning)) router.push("/blogs");
          }}
        >
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
          {text.editor.back}
        </Button>
        <h1 className="font-heading text-2xl font-semibold">{id ? text.editor.editTitle : text.editor.newTitle}</h1>
        <BlogStatusBadge status={status} />
        {dirty ? <span className="text-xs text-amber-600 dark:text-amber-400">{text.editor.unsaved}</span> : null}

        <div className="ml-auto flex flex-wrap gap-2">
          {id && isPublished ? (
            <Button
              variant="outline"
              render={<a href={`https://meetmypets.app/blog/${slug}/`} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="mr-1 size-4" aria-hidden="true" />
              {text.editor.viewLive}
            </Button>
          ) : null}
          {id ? (
            <Button
              variant="outline"
              title={dirty ? text.editor.previewHint : undefined}
              onClick={() => void openPreview(id)}
            >
              <Eye className="mr-1 size-4" aria-hidden="true" />
              {text.editor.preview}
            </Button>
          ) : null}
          {isPublished ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => setPending("unpublish")}>
                {text.editor.unpublish}
              </Button>
              <Button disabled={busy || !dirty} onClick={() => void submit("save")}>
                {save.isPending ? text.editor.saving : text.editor.save}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={busy || (Boolean(id) && !dirty)} onClick={() => void submit("save")}>
                {save.isPending ? text.editor.saving : text.editor.saveDraft}
              </Button>
              <Button disabled={busy} onClick={() => setPending("publish")}>
                {dirty ? text.editor.saveAndPublish : text.editor.publish}
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{text.editor.sections.content}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field id="blog-title" label={f.title} counter={<Counter value={draft.title} max={BLOG_LIMITS.title} />}>
                <Input
                  id="blog-title"
                  value={draft.title}
                  maxLength={BLOG_LIMITS.title}
                  onChange={(event) => set("title", event.target.value)}
                  className="text-base font-medium"
                />
              </Field>

              <Field
                id="blog-slug"
                label={f.slug}
                hint={slugTouched ? (isPublished || post?.publishedAt ? f.slugHint : undefined) : f.slugAuto}
              >
                <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
                  <span className="pl-3 font-mono text-xs text-muted-foreground">/blog/</span>
                  <Input
                    id="blog-slug"
                    value={draft.slug}
                    maxLength={BLOG_LIMITS.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                    }}
                    onBlur={() => set("slug", slugify(draft.slug))}
                    className="border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </Field>

              <Field
                id="blog-excerpt"
                label={f.excerpt}
                hint={f.excerptHint}
                counter={<Counter value={draft.excerpt} max={BLOG_LIMITS.excerpt} guide={SEO_GUIDE.description} />}
              >
                <Textarea
                  id="blog-excerpt"
                  rows={3}
                  value={draft.excerpt}
                  maxLength={BLOG_LIMITS.excerpt}
                  onChange={(event) => set("excerpt", event.target.value)}
                />
              </Field>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span id="blog-body-label" className="text-sm font-medium">
                    {f.body}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {f.words.replace("{n}", String(words)).replace("{m}", String(minutes))}
                  </span>
                </div>
                <RichTextEditor
                  id="blog-body"
                  labelledBy="blog-body-label"
                  initialContent={draft.content}
                  onChange={(doc) => set("content", doc)}
                  onUploadImage={uploadBlogImage}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text.editor.sections.faq}</CardTitle>
            </CardHeader>
            <CardContent>
              <FaqEditor value={draft.faq} onChange={(faq) => set("faq", faq)} />
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader>
              <CardTitle>{text.editor.sections.details}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field id="blog-category" label={f.category}>
                <Select value={draft.categoryId} onValueChange={(value) => set("categoryId", value ?? NO_CATEGORY)}>
                  <SelectTrigger id="blog-category" className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        categories.data?.find((category) => category.id === value)?.name ?? f.noCategory
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>{f.noCategory}</SelectItem>
                    {(categories.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    aria-label={f.newCategory}
                    placeholder={f.newCategoryPlaceholder}
                    value={newCategory}
                    maxLength={80}
                    onChange={(event) => setNewCategory(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!newCategory.trim() || createCategory.isPending}
                    onClick={() => void addCategory()}
                  >
                    {f.add}
                  </Button>
                </div>
              </Field>

              <Field id="blog-tags" label={f.tags} hint={f.tagsHint}>
                <Input id="blog-tags" value={draft.tags} onChange={(event) => set("tags", event.target.value)} />
              </Field>

              <Field id="blog-author" label={f.author} hint={f.authorHint}>
                <Input
                  id="blog-author"
                  value={draft.authorName}
                  maxLength={BLOG_LIMITS.author}
                  onChange={(event) => set("authorName", event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text.editor.sections.image}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ImageField id="blog-featured-image" value={draft.featuredImage} onChange={(url) => set("featuredImage", url)} />
              <Field id="blog-image-alt" label={f.imageAlt} hint={f.imageAltHint}>
                <Input
                  id="blog-image-alt"
                  value={draft.featuredImageAlt}
                  maxLength={BLOG_LIMITS.alt}
                  onChange={(event) => set("featuredImageAlt", event.target.value)}
                />
              </Field>
              <Field id="blog-image-caption" label={f.caption}>
                <Input
                  id="blog-image-caption"
                  value={draft.featuredImageCaption}
                  maxLength={BLOG_LIMITS.caption}
                  onChange={(event) => set("featuredImageCaption", event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text.editor.sections.seo}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field
                id="blog-seo-title"
                label={f.seoTitle}
                hint={f.seoTitleHint}
                counter={<Counter value={draft.seoTitle || draft.title} max={BLOG_LIMITS.seoTitle} guide={SEO_GUIDE.title} />}
              >
                <Input
                  id="blog-seo-title"
                  value={draft.seoTitle}
                  placeholder={draft.title}
                  maxLength={BLOG_LIMITS.seoTitle}
                  onChange={(event) => set("seoTitle", event.target.value)}
                />
              </Field>
              <Field
                id="blog-seo-description"
                label={f.seoDescription}
                hint={f.seoDescriptionHint}
                counter={
                  <Counter
                    value={draft.seoDescription || draft.excerpt}
                    max={BLOG_LIMITS.seoDescription}
                    guide={SEO_GUIDE.description}
                  />
                }
              >
                <Textarea
                  id="blog-seo-description"
                  rows={3}
                  value={draft.seoDescription}
                  placeholder={draft.excerpt}
                  maxLength={BLOG_LIMITS.seoDescription}
                  onChange={(event) => set("seoDescription", event.target.value)}
                />
              </Field>
              <Field id="blog-og-image" label={f.ogImage} hint={f.ogImageHint}>
                <ImageField id="blog-og-image" value={draft.ogImage} onChange={(url) => set("ogImage", url)} />
              </Field>
              <Field id="blog-canonical" label={f.canonical} hint={f.canonicalHint}>
                <Input
                  id="blog-canonical"
                  type="url"
                  value={draft.canonicalUrl}
                  placeholder={`https://meetmypets.app/blog/${draft.slug || "…"}/`}
                  onChange={(event) => set("canonicalUrl", event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          {id ? (
            <Button variant="destructive" disabled={busy} onClick={() => setPending("delete")}>
              {text.rowActions.delete}
            </Button>
          ) : null}
        </div>
      </div>

      {pending ? (
        <BlogActionDialog
          key={pending}
          action={pending}
          title={draft.title || text.editor.newTitle}
          isPending={busy}
          onConfirm={(reason) => runAction(pending, reason)}
          onOpenChange={(open) => (open ? null : setPending(null))}
        />
      ) : null}
    </div>
  );
}
