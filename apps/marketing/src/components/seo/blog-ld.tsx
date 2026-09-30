import type { BlogPost } from "@/config/blog";
import { site } from "@/config/site";

// Same rule as json-ld.tsx: every claim here mirrors visible page content.
function Ld({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is authored locally in this repo, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** BlogPosting for one article, plus FAQPage when the post carries a Q&A block. */
export function BlogPostingLd({ post }: { post: BlogPost }) {
  const url = `${site.url}/blog/${post.slug}`;

  return (
    <>
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: `${site.url}${post.hero.src}`,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          articleSection: post.category,
          keywords: post.tags.join(", "),
          // Organization, not Person — the team publishes collectively.
          author: { "@type": "Organization", name: site.name, url: site.url },
          publisher: {
            "@type": "Organization",
            name: site.name,
            logo: { "@type": "ImageObject", url: `${site.url}/brand-mark.webp` },
          },
          // Omitted entirely until the team sets a date — a fabricated one is worse than none.
          ...(post.published ? { datePublished: post.published } : {}),
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

/** Blog index — lists the posts so crawlers see the collection, not five orphans. */
export function BlogIndexLd({ posts }: { posts: BlogPost[] }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Blog",
        name: `${site.name} Blog`,
        url: `${site.url}/blog`,
        publisher: { "@type": "Organization", name: site.name, url: site.url },
        blogPost: posts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          description: p.excerpt,
          url: `${site.url}/blog/${p.slug}`,
          image: `${site.url}${p.hero.src}`,
        })),
      }}
    />
  );
}
