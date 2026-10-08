import { blogMeta, site } from "@/config/site";
import type { BlogArticle, BlogCard } from "@/lib/blog";
import { absoluteUrl } from "@/lib/blog-utils";

// Same rule as json-ld.tsx: every claim here mirrors visible page content.
function Ld({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Blog content is CMS input. JSON.stringify does not escape "<", so a
      // title containing "</script>" would end this tag early and inject
      // markup; < is the same character to a JSON parser.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function postUrl(slug: string): string {
  return `${site.url}/blog/${slug}/`;
}

/** The team byline is the organisation; any other name is a person. */
function author(name: string) {
  return name === blogMeta.author
    ? { "@type": "Organization", name: site.name, url: site.url }
    : { "@type": "Person", name };
}

/** BlogPosting + BreadcrumbList for one article, plus FAQPage when it has a Q&A block. */
export function BlogPostingLd({ post }: { post: BlogArticle }) {
  const url = post.canonicalUrl ?? postUrl(post.slug);
  const image = post.featuredImage ? absoluteUrl(post.featuredImage, site.url) : undefined;

  return (
    <>
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.seoDescription ?? post.excerpt,
          ...(image ? { image } : {}),
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          ...(post.category ? { articleSection: post.category.name } : {}),
          ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
          author: author(post.authorName),
          publisher: {
            "@type": "Organization",
            name: site.name,
            logo: { "@type": "ImageObject", url: `${site.url}/brand-mark.webp` },
          },
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
        }}
      />

      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog/` },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        }}
      />

      {post.faq.length > 0 && (
        <Ld
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }}
        />
      )}
    </>
  );
}

/** Blog index — lists the posts so crawlers see the collection, not orphans. */
export function BlogIndexLd({ posts }: { posts: BlogCard[] }) {
  return (
    <>
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: `${site.name} Blog`,
          url: `${site.url}/blog/`,
          publisher: { "@type": "Organization", name: site.name, url: site.url },
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            url: p.canonicalUrl ?? postUrl(p.slug),
            datePublished: p.publishedAt,
            ...(p.featuredImage ? { image: absoluteUrl(p.featuredImage, site.url) } : {}),
          })),
        }}
      />
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog/` },
          ],
        }}
      />
    </>
  );
}
