import { useEffect, useState } from "react";
import { getGhostPostsForSections, type NewsPost } from "../lib/ghostNews";
import { getAppError } from "../lib/appError";

const NEWS_SECTION_SLUGS = ["community", "comms", "live-patch-notes"] as const;

export function useNewsFeed() {
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void getGhostPostsForSections([...NEWS_SECTION_SLUGS], 6)
      .then((posts) => {
        if (!mounted) return;
        setNewsPosts(posts);
        setNewsError(null);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setNewsError(getAppError(error, "We couldn't load the Ghost content feed right now.").message);
      })
      .finally(() => {
        if (!mounted) return;
        setNewsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    newsPosts,
    newsLoading,
    newsError,
  };
}
