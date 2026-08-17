/** Turn a YouTube/Vimeo/watch URL into a safe iframe src, or null. */
export function embedVideoSrc(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const parts = u.pathname.split("/").filter(Boolean);
      const kind = parts.findIndex((p) => ["embed", "shorts", "live", "v"].includes(p));
      const id = kind >= 0 ? parts[kind + 1] : null;
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[0] === "video" ? parts[1] : parts[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function mapQuery(location: string | null | undefined) {
  if (!location) return null;
  const q = location.replace(/online/gi, "").replace(/[/|]/g, " ").trim();
  if (!q || q.length < 2) return null;
  return q;
}

export function openStreetMapEmbed(location: string | null | undefined) {
  const q = mapQuery(location);
  if (!q) return null;
  return `https://www.openstreetmap.org/export/embed.html?search=${encodeURIComponent(q)}`;
}

export function isImageAttachment(url: string | null | undefined) {
  if (!url) return false;
  return /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(url) || /blob\.vercel-storage\.com/i.test(url);
}
