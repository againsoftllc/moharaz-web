import Image from "next/image";
import type { Post } from "@/lib/blog";
import { ic } from "@/lib/data";

/** The post's featured photo, or generated cover art in its colour when it has none. */
export default function PostCover({ post, big }: { post: Post; big?: boolean }) {
  if (post.cover) return (
    <Image
      className="post-cover photo"
      src={post.cover}
      alt={post.title}
      fill
      sizes={big ? "(max-width: 1320px) 100vw, 1320px" : "(max-width: 680px) 100vw, (max-width: 1200px) 50vw, 420px"}
      preload={big}
      // a cover the admin set to another site's address: shown as is (next/image only optimizes this site's /uploads)
      unoptimized={/^https?:\/\//i.test(post.cover)}
    />
  );
  const id = `pc-${post.slug}${big ? "-b" : ""}`;
  return (
    <svg className="post-cover" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0e0e11" /><stop offset="1" stopColor={post.color} stopOpacity=".85" /></linearGradient>
        <pattern id={`${id}-g`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0v32" fill="none" stroke="#fff" strokeOpacity=".06" /></pattern>
      </defs>
      <rect width="640" height="360" fill={`url(#${id})`} />
      <rect width="640" height="360" fill={`url(#${id}-g)`} />
      <circle cx="500" cy="180" r="170" fill={post.color} opacity=".25" />
      <g transform="translate(400 80) scale(8.4)" stroke="#fff" strokeOpacity=".9" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ic[post.icon] }} />
      <text x="40" y="320" fontWeight="800" fontSize="18" letterSpacing="4" fill="#fff" opacity=".7">{post.tag.toUpperCase()}</text>
    </svg>
  );
}
