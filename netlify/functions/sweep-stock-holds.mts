// Netlify counterpart of the "crons" entry in vercel.json. Runs 12 hours apart from it
// because sweepExpiredStockHolds would restore stock twice if two sweeps overlapped.
export default async function sweepStockHolds(): Promise<Response> {
  const siteUrl = process.env.URL;
  if (!siteUrl) {
    throw new Error("[cron/sweep-stock-holds] URL is not set");
  }

  const cronSecret = process.env.CRON_SECRET;
  const response = await fetch(new URL("/api/cron/sweep-stock-holds", siteUrl), {
    headers: cronSecret ? { authorization: `Bearer ${cronSecret}` } : {},
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `[cron/sweep-stock-holds] Failed with status ${response.status}: ${body}`,
    );
  }

  console.log("[cron/sweep-stock-holds]", body);
  return new Response(body, { status: response.status });
}

export const config = {
  schedule: "0 12 * * *",
};
