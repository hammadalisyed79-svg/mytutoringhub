async function main() {
  const url = "https://www.mytutoringhub.com/listings/cmtdgoszf000bhyhj4ogze411";
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "MTH-Phase10-Verify" } });
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const body = await res.text();
  console.log(
    JSON.stringify(
      {
        status: res.status,
        headers,
        title: (body.match(/<title>([^<]+)<\/title>/i) || [])[1] || "",
        metaRefresh: (body.match(/id="__next-page-redirect"[^>]*content="([^"]+)"/i) || [])[1] || "",
        nextRedirect: (body.match(/NEXT_REDIRECT;(?:replace|push);([^;]+);(\d+)/) || []).slice(1),
        snippet: body.slice(0, 400),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
