export const GHOST_CONTENT_API_URL =
  "https://admin.r5reloaded.com/ghost/api/content";
export const GHOST_CONTENT_API_KEY = "75d19830bc19c339c69eff0c51";

type GhostTag = {
  name: string;
  slug: string;
};

type GhostAuthor = {
  name: string;
};

type GhostPost = {
  id: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  url: string;
  feature_image: string | null;
  tags?: GhostTag[] | null;
  authors?: GhostAuthor[] | null;
};

type GhostPostsResponse = {
  posts: GhostPost[];
};

export type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  publishedLabel: string;
  url: string;
  featureImage: string | null;
  tag: string;
  tagSlugs: string[];
  sectionSlug: string | null;
  author: string;
};

const postsPromiseByFilter = new Map<string, Promise<NewsPost[]>>();

function toRelativeDateLabel(dateString: string) {
  const published = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(0, Math.floor(diffMs / dayMs));

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;

  return published.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === published.getFullYear() ? undefined : "numeric",
  });
}

function normalizePost(post: GhostPost): NewsPost {
  const tagSlugs = post.tags?.map((tag) => tag.slug).filter(Boolean) || [];
  const sectionSlug =
    tagSlugs.find((slug) =>
      ["community", "comms", "live-patch-notes"].includes(slug),
    ) || null;

  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt?.trim() || "Read the latest update from the R5 Reloaded team.",
    publishedAt: post.published_at,
    publishedLabel: toRelativeDateLabel(post.published_at),
    url: post.url,
    featureImage: post.feature_image,
    tag: post.tags?.[0]?.name || "Update",
    tagSlugs,
    sectionSlug,
    author: post.authors?.[0]?.name || "R5 Reloaded",
  };
}

function getGhostPostsRequestKey(filter: string, limit: number) {
  return `${filter}::${limit}`;
}

async function fetchGhostPosts(filter: string, limit: number) {
  const requestLimit = Math.max(limit, 8);
  const cacheKey = getGhostPostsRequestKey(filter, requestLimit);

  if (!postsPromiseByFilter.has(cacheKey)) {
    const params = new URLSearchParams({
      key: GHOST_CONTENT_API_KEY,
      include: "tags,authors",
      limit: String(requestLimit),
      fields: "id,title,excerpt,published_at,url,feature_image",
    });

    if (filter) {
      params.set("filter", filter);
    }

    const request = fetch(`${GHOST_CONTENT_API_URL}/posts/?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Ghost API returned ${response.status}`);
        }
        return (await response.json()) as GhostPostsResponse;
      })
      .then((data) => data.posts.map(normalizePost));

    postsPromiseByFilter.set(cacheKey, request);
  }

  const posts = await postsPromiseByFilter.get(cacheKey)!;
  return posts.slice(0, limit);
}

export async function getGhostPosts(limit = 8) {
  return fetchGhostPosts("", limit);
}

export async function getGhostPostsForSections(sectionSlugs: string[], limitPerSection = 6) {
  const allPosts = await Promise.all(
    sectionSlugs.map((slug) => fetchGhostPosts(`tag:${slug}`, limitPerSection)),
  );

  const merged = new Map<string, NewsPost>();

  for (const sectionPosts of allPosts) {
    for (const post of sectionPosts) {
      if (!merged.has(post.id)) {
        merged.set(post.id, post);
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
