import { Clock3, Newspaper } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { NewsPost } from "../../lib/ghostNews";
import { assignNewsDisplayImages } from "../../lib/newsImages";
import { ASSETS } from "../../config/assets";
import { Img } from "../ui/media/Img";

const NEWS_SECTIONS = [
  {
    slug: "live-patch-notes",
    title: "Latest Patch Notes",
  },
  {
    slug: "community",
    title: "Community",
  },
  {
    slug: "comms",
    title: "Comms",
  },
] as const;

function matchesSection(post: NewsPost, slug: (typeof NEWS_SECTIONS)[number]["slug"]) {
  if (post.sectionSlug === slug) return true;
  if (post.tagSlugs.includes(slug)) return true;

  const normalizedTag = post.tag.trim().toLowerCase();
  if (slug === "live-patch-notes") {
    return normalizedTag === "live patch notes";
  }

  return normalizedTag === slug;
}

function openPost(url: string) {
  void openUrl(url);
}

function shorten(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
}

function NewsCard({
  post,
  imageSrc,
  featured = false,
}: {
  post: NewsPost;
  imageSrc: string;
  featured?: boolean;
}) {
  const imageOverlayClass = featured
    ? "absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,11,0.9)_0%,rgba(7,8,11,0.72)_42%,rgba(7,8,11,0.26)_76%,rgba(7,8,11,0.1)_100%)]"
    : "absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,11,0.2)_0%,rgba(7,8,11,0.52)_48%,rgba(7,8,11,0.95)_100%)]";
  const lowerOverlayClass = featured
    ? "absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(0deg,rgba(7,8,11,0.96),rgba(7,8,11,0.08))]"
    : null;
  const glowClass = featured
    ? "absolute inset-0 bg-[radial-gradient(circle_at_18%_78%,rgba(255,90,47,0.14),transparent_32%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
    : "absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(255,90,47,0.12),transparent_30%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100";
  const contentClass = featured
    ? "relative z-30 flex h-full max-w-[860px] flex-col justify-end p-5"
    : "relative z-30 flex h-full flex-col justify-end p-5";
  const titleLength = featured ? 110 : 72;
  const excerptLength = featured ? 180 : 145;
  const excerptClass = featured
    ? "mt-3 max-w-[56ch] text-[13px] leading-6 text-[#d4dae4]"
    : "mt-3 max-w-[48ch] text-[13px] leading-6 text-[#d4dae4]";

  return (
    <button
      type="button"
      onClick={() => openPost(post.url)}
      className="promo-card-apex group relative min-h-[260px] w-full overflow-hidden border border-white/12 bg-[#12161d] text-left text-legible"
    >
      <span className="absolute inset-0 bg-[linear-gradient(140deg,#141922,#151720_45%,#2d1714_100%)]" />
      <Img
        src={imageSrc}
        alt={post.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className={imageOverlayClass} />
      {lowerOverlayClass ? <span className={lowerOverlayClass} /> : null}
      <span className={glowClass} />
      <span className="absolute left-0 top-[18px] z-20 h-[8px] w-[55px] origin-left rotate-[-45deg] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute left-[18px] right-0 top-0 z-20 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-0 left-0 top-[18px] z-20 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-y-0 right-0 z-20 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />

      <div className={contentClass}>
        <div className="mb-3 flex items-center gap-3">
          <span className="news-panel-tag">{post.tag}</span>
          <span className="flex items-center gap-1 font-cond text-[10px] uppercase tracking-[0.14em] text-ink-dim">
            <Clock3 size={11} />
            {post.publishedLabel}
          </span>
        </div>
        <h3 className="max-w-[20ch] font-display text-[28px] font-bold uppercase leading-[0.96] tracking-[0.03em] text-white">
          {shorten(post.title, titleLength)}
        </h3>
        <p className={excerptClass}>{shorten(post.excerpt, excerptLength)}</p>
        <div className="mt-4 flex items-center gap-3 font-cond text-[10px] uppercase tracking-[0.14em] text-ink-dim">
          <span>{post.author}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-white/30" />
          <span>Open article</span>
        </div>
      </div>
    </button>
  );
}

export default function NewsView({
  posts,
  loading,
  error,
}: {
  posts: NewsPost[];
  loading: boolean;
  error: string | null;
}) {
  const displayImages = assignNewsDisplayImages(posts);
  const matchedPostIds = new Set<string>();
  const groupedSections = NEWS_SECTIONS.map((section) => {
    const sectionPosts = posts.filter((post) => matchesSection(post, section.slug));
    sectionPosts.forEach((post) => matchedPostIds.add(post.id));
    return {
      ...section,
      posts: sectionPosts,
    };
  }).filter((section) => section.posts.length > 0);
  const uncategorizedPosts = posts.filter((post) => !matchedPostIds.has(post.id));
  const sections =
    groupedSections.length > 0
      ? groupedSections
      : uncategorizedPosts.length > 0
        ? [
            {
              slug: "latest",
              title: "Latest Updates",
              posts: uncategorizedPosts,
            },
          ]
        : [];

  return (
    <div className="relative h-full w-full overflow-auto px-8 pb-8 pt-8">
      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-6 fade-up">

        {loading ? (
          <div className="news-panel-shell flex min-h-[420px] items-center justify-center">
            <div className="font-cond text-[14px] uppercase tracking-[0.18em] text-ink-dim">
              Loading latest dispatches
            </div>
          </div>
        ) : error ? (
          <div className="news-panel-shell flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
            <Newspaper size={26} className="text-red" strokeWidth={1.6} />
            <div className="font-display text-[26px] font-bold uppercase tracking-[0.05em] text-ink">
              News feed unavailable
            </div>
            <p className="max-w-[420px] text-[14px] leading-6 text-ink-dim">{error}</p>
          </div>
        ) : sections.length > 0 ? (
          <div className="flex min-h-0 flex-col gap-6">
            {sections.map((section) => (
              <div key={section.slug} className="relative">
                <div className="mb-4">
                  <h2 className="font-display text-[20px] font-bold uppercase leading-none tracking-wide text-ink">
                    {section.title}
                  </h2>
                </div>
                {section.slug === "live-patch-notes" ? (
                  <NewsCard
                    post={section.posts[0]}
                    imageSrc={displayImages.get(section.posts[0].id) || ASSETS.promoFallbacks[0]}
                    featured
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
                    {section.posts.map((post) => (
                      <NewsCard
                        key={post.id}
                        post={post}
                        imageSrc={displayImages.get(post.id) || ASSETS.promoFallbacks[0]}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="news-panel-shell flex min-h-[420px] items-center justify-center">
            <div className="font-cond text-[14px] uppercase tracking-[0.18em] text-ink-dim">
              No news posts found
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
