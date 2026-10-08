"use client";

import { MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BlogActionDialog } from "@/components/blogs/blog-action-dialog";
import { BlogStatusBadge, formatDate } from "@/components/blogs/blog-format";
import { FilterSelect } from "@/components/users/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { QueryErrorCard } from "@/components/shared/query-error-card";
import { SortableHead } from "@/components/shared/sortable-head";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { copy } from "@/config/admin";
import {
  openPreview,
  reportRevalidation,
  useBlogAction,
  useBlogCategories,
  useBlogPosts,
} from "@/hooks/use-blogs";
import { useUrlSyncedQuery } from "@/hooks/use-url-query";
import {
  BLOG_LIST_DEFAULTS,
  BLOG_STATUSES,
  type BlogAction,
  type BlogListQuery,
  type BlogSort,
  type BlogSummary,
} from "@/lib/blog-contract";

const COLUMN_COUNT = 8;
const text = copy.blogs;

const ACTION_TOAST: Record<BlogAction, string> = {
  publish: text.toast.published,
  unpublish: text.toast.unpublished,
  delete: text.toast.deleted,
};

export function BlogsTable({ initialQuery }: { initialQuery: BlogListQuery }) {
  const [query, setQuery] = useUrlSyncedQuery(initialQuery, BLOG_LIST_DEFAULTS, { active: true });
  const [pending, setPending] = useState<{ post: BlogSummary; action: BlogAction } | null>(null);

  const posts = useBlogPosts(query);
  const categories = useBlogCategories();
  const act = useBlogAction();

  // Debounced search, same shape as ListToolbar: the input owns its value and
  // only commits to the query once typing pauses.
  const [search, setSearch] = useState(initialQuery.q ?? "");
  const committed = useRef(initialQuery.q ?? "");
  useEffect(() => {
    if (search === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = search;
      setQuery((prev) => ({ ...prev, q: search || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setQuery]);

  const hasFilters = Boolean(query.q) || query.status !== "all" || query.category !== "all";

  function sortBy(column: BlogSort, dir: "asc" | "desc") {
    setQuery((prev) => ({ ...prev, sort: column, dir, page: 1 }));
  }

  async function confirmAction(reason: string | undefined) {
    if (!pending) return;
    const result = await act.mutateAsync({ id: pending.post.id, action: pending.action, reason });
    reportRevalidation(result, ACTION_TOAST[pending.action]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-60 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.searchPlaceholder}
            aria-label={text.searchPlaceholder}
            className="pl-9"
          />
        </div>
        <FilterSelect
          id="blog-status"
          label={text.filters.status}
          value={query.status}
          options={[
            { value: "all", label: text.filters.allStatuses },
            ...BLOG_STATUSES.map((status) => ({ value: status, label: text.statusLabels[status] })),
          ]}
          onChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
        />
        <FilterSelect
          id="blog-category"
          label={text.filters.category}
          value={query.category}
          className="w-52"
          options={[
            { value: "all", label: text.filters.allCategories },
            ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.name })),
          ]}
          onChange={(category) => setQuery((prev) => ({ ...prev, category, page: 1 }))}
        />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              committed.current = "";
              setQuery((prev) => ({ ...prev, q: undefined, status: "all", category: "all", page: 1 }));
            }}
          >
            {text.filters.clear}
          </Button>
        ) : null}
        <Button className="ml-auto" render={<Link href="/blogs/new" />}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {text.create}
        </Button>
      </div>

      {posts.isError ? (
        <QueryErrorCard message={posts.error.message} onRetry={() => posts.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    column="title"
                    label={text.columns.title}
                    activeColumn={query.sort}
                    direction={query.dir}
                    onSort={sortBy}
                    className="min-w-72"
                  />
                  <TableHead>{text.columns.status}</TableHead>
                  <TableHead>{text.columns.category}</TableHead>
                  <TableHead>{text.columns.author}</TableHead>
                  <SortableHead
                    column="created"
                    label={text.columns.created}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  <SortableHead
                    column="updated"
                    label={text.columns.updated}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  <SortableHead
                    column="published"
                    label={text.columns.published}
                    activeColumn={query.sort}
                    direction={query.dir}
                    defaultDirection="desc"
                    onSort={sortBy}
                  />
                  <TableHead className="text-right">
                    <span className="sr-only">{text.columns.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.isPending ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : posts.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
                      {hasFilters ? text.emptyFiltered : text.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.data.items.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-md">
                        <Link
                          href={`/blogs/${post.id}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {post.title}
                        </Link>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          /blog/{post.slug}/
                        </span>
                      </TableCell>
                      <TableCell>
                        <BlogStatusBadge status={post.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {post.categoryName ?? text.uncategorised}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{post.authorName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {formatDate(post.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {formatDate(post.updatedAt)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {post.publishedAt ? formatDate(post.publishedAt) : text.notPublished}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowMenu post={post} onAction={(action) => setPending({ post, action })} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {posts.data ? (
            <Pagination
              page={posts.data.page}
              pageSize={posts.data.pageSize}
              total={posts.data.total}
              onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
            />
          ) : null}
        </>
      )}

      {pending ? (
        <BlogActionDialog
          key={`${pending.post.id}-${pending.action}`}
          action={pending.action}
          title={pending.post.title}
          isPending={act.isPending}
          onConfirm={confirmAction}
          onOpenChange={(open) => (open ? null : setPending(null))}
        />
      ) : null}
    </div>
  );
}

function RowMenu({ post, onAction }: { post: BlogSummary; onAction: (action: BlogAction) => void }) {
  const actions = text.rowActions;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={actions.menu.replace("{title}", post.title)}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={`/blogs/${post.id}`} />}>{actions.edit}</DropdownMenuItem>
          {post.status === "published" ? (
            <DropdownMenuItem render={<a href={post.publicUrl} target="_blank" rel="noopener noreferrer" />}>
              {actions.view}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => void openPreview(post.id)}>{actions.preview}</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {post.status === "published" ? (
            <DropdownMenuItem onClick={() => onAction("unpublish")}>{actions.unpublish}</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onAction("publish")}>{actions.publish}</DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
            {actions.delete}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
