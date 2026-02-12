/**
 * Apify Epstein Files API Integration
 * 
 * Uses the Apify Epstein Files Scraper API to search documents
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "lOeaare6FNssOyQyV"; // lofomachines/epstein-files-scraper-api

export interface ApifyDocument {
  keyword: string;
  page: number;
  documentId: string;
  chunkIndex: number;
  originFileName: string;
  originFileUri: string;
  sourceContentType: string;
  extractedText: string;
  highlight: string[];
  processedAt: string;
  indexedAt: string;
}

export interface ApifySearchResult {
  documents: ApifyDocument[];
  keyword: string;
  totalResults: number;
}

/**
 * Search Epstein files using Apify API
 * Uses waitForFinish for efficiency instead of polling
 */
export async function searchApify(
  keywords: string[],
  maxItemsPerKeyword: number = 50
): Promise<ApifyDocument[]> {
  if (!APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN not configured");
  }

  console.log(`[Apify] Starting search for keywords: ${keywords.join(", ")}`);

  // Start the actor run with waitForFinish to avoid polling overhead
  // waitForFinish=50 means the API will block for up to 50 seconds waiting for completion
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=50`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords,
        maxItems: maxItemsPerKeyword,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: [],
        },
      }),
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    console.error(`[Apify] Run start failed: ${error}`);
    throw new Error(`Apify API error: ${runResponse.status}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;
  const status = runData.data.status;
  const datasetId = runData.data.defaultDatasetId;

  console.log(`[Apify] Run ${runId} status after wait: ${status}`);

  // If it didn't finish during waitForFinish, poll briefly
  if (status === "RUNNING" || status === "READY") {
    let currentStatus = status;
    let attempts = 0;
    const maxAttempts = 3; // Only 3 more tries (9 more seconds)

    while ((currentStatus === "RUNNING" || currentStatus === "READY") && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      currentStatus = statusData.data.status;
      attempts++;
      console.log(`[Apify] Poll ${attempts}: status=${currentStatus}`);
    }

    if (currentStatus !== "SUCCEEDED") {
      console.error(`[Apify] Run did not complete in time. Final status: ${currentStatus}`);
      throw new Error(`Search timed out. Try a more specific query.`);
    }
  } else if (status !== "SUCCEEDED") {
    console.error(`[Apify] Run failed with status: ${status}`);
    throw new Error(`Search failed with status: ${status}`);
  }

  // Get the results from the dataset
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
  );

  if (!resultsResponse.ok) {
    throw new Error("Failed to fetch Apify results");
  }

  const results: ApifyDocument[] = await resultsResponse.json();
  console.log(`[Apify] Got ${results.length} results`);
  return results;
}

/**
 * Quick search - returns results from Apify
 */
export async function quickSearch(query: string): Promise<ApifyDocument[]> {
  return searchApify([query], 50);
}
