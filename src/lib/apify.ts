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
 */
export async function searchApify(
  keywords: string[],
  maxItemsPerKeyword: number = 50
): Promise<ApifyDocument[]> {
  if (!APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN not configured");
  }

  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
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
    throw new Error(`Apify API error: ${error}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;

  // Wait for the run to complete
  let status = "RUNNING";
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max wait

  while (status === "RUNNING" && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
    );
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Get the results from the dataset
  const datasetId = runData.data.defaultDatasetId;
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
  );

  if (!resultsResponse.ok) {
    throw new Error("Failed to fetch Apify results");
  }

  const results: ApifyDocument[] = await resultsResponse.json();
  return results;
}

/**
 * Quick search - returns cached results if available, otherwise fetches from Apify
 */
export async function quickSearch(query: string): Promise<ApifyDocument[]> {
  // For now, just call Apify directly
  // In the future, we could add caching here
  return searchApify([query], 50);
}
