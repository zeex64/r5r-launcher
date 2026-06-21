import { ASSETS } from "../config/assets";
import type { NewsPost } from "./ghostNews";

export function assignNewsDisplayImages(posts: NewsPost[]) {
  const assigned = new Map<string, string>();
  const pool = [...ASSETS.promoFallbacks];

  let fallbackIndex = 0;
  for (const post of posts) {
    if (post.featureImage) {
      assigned.set(post.id, post.featureImage);
      continue;
    }

    const fallback = pool[fallbackIndex % pool.length] || ASSETS.promoFallbacks[0];
    assigned.set(post.id, fallback);
    fallbackIndex += 1;
  }

  return assigned;
}
