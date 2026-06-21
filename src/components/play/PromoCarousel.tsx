import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ASSETS } from "../../config/assets";
import type { NewsPost } from "../../lib/ghostNews";
import { assignNewsDisplayImages } from "../../lib/newsImages";
import { playNavHover, playUtilityHover } from "../../lib/uiSound";
import { Img } from "../ui/media/Img";

type PromoSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
  image?: string;
  tint?: string;
};

type PromoCarouselProps = {
  posts?: NewsPost[];
};

type PromoSlideCardProps = {
  slide: PromoSlide;
  slides: PromoSlide[];
  activeIndex: number;
  slideIndex: number;
  onSelect: (index: number) => void;
};

const FALLBACK_SLIDES: PromoSlide[] = [
  {
    id: "fallback-1",
    eyebrow: "Lorem",
    title: "Ipsum",
    description: "Launcher updates and featured community headlines.",
    image: ASSETS.promoFallbacks[0],
    tint: "linear-gradient(115deg,#1b1e24,#241d1d 70%,#2e1a1a)",
  },
  {
    id: "fallback-2",
    eyebrow: "Dolor",
    title: "Sit Amet",
    description: "Patch notes, announcements, and spotlight posts.",
    image: ASSETS.promoFallbacks[1],
    tint: "linear-gradient(115deg,#171a20,#1c2330 70%,#15202b)",
  },
  {
    id: "fallback-3",
    eyebrow: "Consectetur",
    title: "Adipiscing",
    description: "Stay current with the latest R5 Reloaded changes.",
    image: ASSETS.promoFallbacks[2],
    tint: "linear-gradient(115deg,#1a1922,#231d2b 70%,#1d1a2e)",
  },
];

const ROTATE_MS = 6000;

function hasTag(post: NewsPost, slug: string) {
  return post.sectionSlug === slug || post.tagSlugs.includes(slug);
}

function buildPromoPosts(posts: NewsPost[]) {
  const latestPatchNotes = posts.find((post) => hasTag(post, "live-patch-notes"));
  const communityAndComms = posts.filter(
    (post) =>
      post.id !== latestPatchNotes?.id &&
      (hasTag(post, "community") || hasTag(post, "comms")),
  );

  const ordered = [
    ...(latestPatchNotes ? [latestPatchNotes] : []),
    ...communityAndComms,
  ];

  return ordered.slice(0, 4);
}

function shorten(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
}

function toPromoSlide(post: NewsPost, index: number): PromoSlide {
  const fallbackTints = [
    "linear-gradient(115deg,#1b1e24,#241d1d 70%,#2e1a1a)",
    "linear-gradient(115deg,#171a20,#1c2330 70%,#15202b)",
    "linear-gradient(115deg,#1a1922,#231d2b 70%,#1d1a2e)",
    "linear-gradient(115deg,#191f28,#231a19 70%,#2a1914)",
  ];

  return {
    id: post.id,
    eyebrow: post.tag,
    title: shorten(post.title, 48),
    description: shorten(post.excerpt, 72),
    href: post.url,
    image: post.featureImage || undefined,
    tint: fallbackTints[index % fallbackTints.length],
  };
}

function PromoSlideCard({
  slide,
  slides,
  activeIndex,
  slideIndex,
  onSelect,
}: PromoSlideCardProps) {
  const active = slideIndex === activeIndex;

  const handleOpen = () => {
    if (slide.href) {
      void openUrl(slide.href);
    }
  };

  return (
    <div
      role="button"
      tabIndex={active ? 0 : -1}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={`promo-card-apex group absolute inset-0 h-[106px] overflow-hidden text-legible transition-opacity duration-500 ${
        active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <span
        className="absolute inset-0 z-0"
        style={{ background: slide.tint }}
      />
      {slide.image && (
        <Img
          src={slide.image}
          className="absolute inset-0 z-10 h-full w-full object-cover"
        />
      )}
      <span className="absolute inset-0 z-20 bg-[linear-gradient(90deg,rgba(7,8,11,0.9)_0%,rgba(7,8,11,0.78)_34%,rgba(7,8,11,0.3)_74%,rgba(7,8,11,0.08)_100%)]" />
      <span className="promo-card-dot-overlay pointer-events-none absolute inset-y-0 right-0 z-30 w-[40%]" />
      <span className="pointer-events-none absolute inset-0 z-35 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="absolute -left-6 -top-6 h-28 w-44 bg-[radial-gradient(circle_at_top_left,rgba(255,90,47,0.52)_0%,rgba(255,90,47,0.22)_34%,rgba(255,90,47,0.08)_52%,rgba(255,90,47,0.03)_66%,transparent_84%)] blur-[2px]" />
        <span className="absolute -bottom-6 -right-6 h-28 w-44 bg-[radial-gradient(circle_at_bottom_right,rgba(255,90,47,0.52)_0%,rgba(255,90,47,0.22)_34%,rgba(255,90,47,0.08)_52%,rgba(255,90,47,0.03)_66%,transparent_84%)] blur-[2px]" />
      </span>
      <span className="absolute left-[18px] right-0 top-0 z-40 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-x-0 bottom-0 z-40 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-0 left-0 top-[18px] z-40 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-y-0 right-0 z-40 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute left-0 top-[17px] z-40 h-[8px] w-[30px] origin-left rotate-[-45deg] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />

      <div className="relative z-50 flex h-full items-center px-5">
        <div className="flex max-w-[272px] flex-col items-start justify-center">
          <span className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap font-display text-[12px] font-bold uppercase leading-none tracking-[0.04em] text-white">
            {slide.eyebrow}
          </span>
          <span className="mt-1 max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap font-display text-[15px] font-bold uppercase leading-none tracking-[0.03em] text-red">
            {slide.title}
          </span>
          <span className="mt-2 max-h-[32px] max-w-[220px] overflow-hidden font-ui text-[10px] leading-4 text-ink/80">
            {slide.description}
          </span>
          <div className="mt-3 flex items-center gap-2">
            {slides.map((currentSlide, index) => (
              <button
                key={currentSlide.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(index);
                }}
                aria-label={`${currentSlide.eyebrow} ${currentSlide.title}`}
                className={`h-[3px] transition-colors duration-150 ${
                  index === activeIndex ? "w-7 bg-red" : "w-7 bg-white/88 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PromoCarousel({ posts = [] }: PromoCarouselProps) {
  const displayImages = assignNewsDisplayImages(posts);
  const promoPosts = buildPromoPosts(posts);
  const slides =
    promoPosts.length > 0
      ? promoPosts.map((post, index) => ({
          ...toPromoSlide(post, index),
          image: displayImages.get(post.id) || post.featureImage || ASSETS.promoFallbacks[0],
        }))
      : FALLBACK_SLIDES;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const stepSlide = (direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => stepSlide(1), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, slides.length - 1));
  }, [slides.length]);

  return (
    <div
      className="relative h-[106px] w-[320px]"
      onMouseEnter={() => {
        playNavHover();
        setPaused(true);
      }}
      onMouseLeave={() => setPaused(false)}
      onWheel={(event) => {
        event.preventDefault();
        setPaused(true);
        if (Math.abs(event.deltaY) < 4) return;
        playUtilityHover();
        stepSlide(event.deltaY > 0 ? 1 : -1);
      }}
    >
      {slides.map((slide, slideIndex) => (
        <PromoSlideCard
          key={slide.id}
          slide={slide}
          slides={slides}
          activeIndex={activeIndex}
          slideIndex={slideIndex}
          onSelect={setActiveIndex}
        />
      ))}
    </div>
  );
}
