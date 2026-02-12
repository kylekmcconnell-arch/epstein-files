import { NextRequest, NextResponse } from "next/server";
import { searchApify } from "@/lib/apify";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max (Vercel limit)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Classify whether a question is "broad" (better answered from GPT's knowledge)
 * or "specific" (needs deep document search)
 */
function classifyQuestion(question: string): "broad" | "specific" {
  const q = question.toLowerCase();

  // Broad patterns - overview, count, general involvement questions
  const broadPatterns = [
    /how many times/,
    /how often/,
    /how much/,
    /is .+ mentioned/,
    /was .+ mentioned/,
    /are .+ mentioned/,
    /were .+ mentioned/,
    /tell me about/,
    /what do (we|you) know about/,
    /what('s| is) .+('s|s) (connection|involvement|role|relationship)/,
    /overview/,
    /summary/,
    /summarize/,
    /general/,
    /who (is|was) .+ (in|to) (the )?(epstein|files|case)/,
    /what (is|was) .+ (connection|involvement|tied|linked|associated)/,
    /everything .+ know about/,
    /what can you tell me/,
    /give me .+ rundown/,
    /who are the (most|biggest|key|main)/,
    /most (mentioned|referenced|connected|linked|involved)/,
    /how (connected|involved|tied|linked) (is|was|are|were)/,
  ];

  for (const pattern of broadPatterns) {
    if (pattern.test(q)) return "broad";
  }

  // If it's a very short question that's basically just a name, it's broad
  const words = q.replace(/[?.,!']/g, "").split(/\s+/).filter(w => w.length > 1);
  if (words.length <= 4) return "broad";

  return "specific";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const questionType = classifyQuestion(question);
    const searchTerms = extractSearchTerms(question);

    console.log(`[Ask] Question type: ${questionType}, terms: ${searchTerms.join(", ")}`);

    if (questionType === "broad") {
      return handleBroadQuestion(question, searchTerms);
    } else {
      return handleSpecificQuestion(question, searchTerms);
    }
  } catch (error: any) {
    console.error("Ask error:", error);

    let errorMessage = "Something went wrong processing your question. Please try again.";

    if (error?.message?.includes("timeout") || error?.message?.includes("TIMEOUT")) {
      errorMessage = "The search took too long. Try a more specific question to get faster results.";
    } else if (error?.message?.includes("API key") || error?.message?.includes("authentication") || error?.status === 401) {
      errorMessage = "AI service configuration issue. Please try again later.";
    } else if (error?.message?.includes("rate limit") || error?.status === 429) {
      errorMessage = "Too many requests. Please wait a moment and try again.";
    }

    return NextResponse.json({
      question: "",
      answer: errorMessage,
      sources: [],
    });
  }
}

/**
 * Handle broad/overview questions using GPT's knowledge + small doc sample
 */
async function handleBroadQuestion(question: string, searchTerms: string[]) {
  // Run GPT knowledge answer and a small doc search in parallel
  const [gptAnswer, docResults] = await Promise.all([
    generateBroadAnswer(question),
    fetchSmallDocSample(searchTerms),
  ]);

  let answer = gptAnswer;

  // If we got documents, append a note
  if (docResults && docResults.length > 0) {
    answer += `\n\n---\n\n*The above is based on publicly known information about the Epstein case. I've also pulled ${docResults.length} sample document${docResults.length > 1 ? 's' : ''} from the archive — see the citations panel for specific file references. For deeper analysis, try a more specific question like "What did [name] say in their deposition?" or "What do the flight logs show about [name]?"*`;
  }

  // Safety net: strip any "Sources" section GPT may have added
  answer = answer.replace(/\n\n(?:\*\*)?(?:Sources|References|Documents? cited|Citations?)(?:\*\*)?:?\s*\n[\s\S]*$/i, '').trim();

  const sources = (docResults || []).slice(0, 10).map((doc) => ({
    filename: doc.originFileName,
    sourceUrl: doc.originFileUri,
    excerpt: doc.extractedText.slice(0, 200) + "...",
    highlight: doc.highlight?.slice(0, 2) || [],
  }));

  return NextResponse.json({
    question,
    answer,
    sources,
  });
}

/**
 * Handle specific/targeted questions using full Apify search + GPT analysis
 */
async function handleSpecificQuestion(question: string, searchTerms: string[]) {
  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({
      question,
      answer: "Search API not configured. Please try again later.",
      sources: [],
    });
  }

  // Search Apify for relevant documents
  let results;
  try {
    results = await searchApify(searchTerms, 50);
  } catch (error: any) {
    console.error("Apify search failed:", error);
    // Fall back to broad-style answer if Apify fails
    return handleBroadQuestion(question, searchTerms);
  }

  if (!results || results.length === 0) {
    const opinionPatterns = /\b(guilty|innocent|worst|best|think|opinion|feel|believe|most evil|bad person|good person|blame|fault|responsible)\b/i;
    const isOpinionQuestion = opinionPatterns.test(question);

    const answer = isOpinionQuestion
      ? `That's a broad question and I need specific names or topics to search the 400,000+ document archive effectively.\n\nTry narrowing it down — for example:\n• "What evidence links Bill Clinton to Epstein's island?"\n• "What are the most incriminating details in the flight logs?"\n• "What did witnesses say about Ghislaine Maxwell's role?"\n• "Who visited Epstein's properties the most?"\n\nThe more specific you are, the more I can dig up from the files.`
      : `I couldn't find documents matching that query. I work best with specific names, dates, locations, or events from the Epstein case files.\n\nTry something like:\n• "What did Virginia Giuffre say about Prince Andrew?"\n• "Who is mentioned in the flight logs?"\n• "What happened at the Palm Beach residence?"\n• "What connections did Alan Dershowitz have to Epstein?"`;

    return NextResponse.json({
      question,
      answer,
      sources: [],
    });
  }

  // Build context from search results
  const context = results
    .slice(0, 25)
    .map((doc, i) => `[Document ${i + 1}: ${doc.originFileName}]\n${doc.extractedText.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  // Generate answer using GPT with document context
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant helping users analyze the Epstein case documents. 
You have access to excerpts from official court documents, depositions, and evidence files.

CRITICAL FORMATTING RULES:
- Your response must contain ONLY your analysis text. Nothing else.
- NEVER add a "Sources", "Sources:", "References", "Documents cited", or any kind of source/citation list at the end of your response.
- NEVER list filenames (like EFTA00123456.pdf) at the end of your response.
- The UI already displays source documents in a separate panel — you must NOT duplicate them.

Content guidelines:
- Answer questions based ONLY on the provided document excerpts
- You may reference documents by number inline (e.g., "According to Document 3...")
- If the documents don't contain enough information to answer, say so clearly
- Write like an investigative journalist — present the facts, but don't shy away from connecting dots and highlighting what's suspicious or concerning
- If someone visited Epstein's island multiple times, say they had "close ties" or "frequent contact" — don't sugarcoat patterns
- Highlight suspicious activities, inconsistencies, and concerning patterns found in the documents
- Use language like "the documents raise questions about...", "notably...", "despite claims of...", "records show repeated..."
- Always ground your analysis in the actual documents — never fabricate, but do draw reasonable inferences from the evidence
- If the user asks a vague or opinion-based question (like "who seems most guilty"), don't refuse — instead summarize the most incriminating or suspicious findings across the documents and let the evidence speak for itself
- Keep your answer focused and substantive`,
      },
      {
        role: "user",
        content: `Based on the following document excerpts, please answer this question: "${question}"

DOCUMENT EXCERPTS:
${context}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  let answer = completion.choices[0]?.message?.content || "Unable to generate a response.";

  // Safety net: strip any "Sources" section GPT may have added
  answer = answer.replace(/\n\n(?:\*\*)?(?:Sources|References|Documents? cited|Citations?)(?:\*\*)?:?\s*\n[\s\S]*$/i, '').trim();

  const sources = results.slice(0, 25).map((doc) => ({
    filename: doc.originFileName,
    sourceUrl: doc.originFileUri,
    excerpt: doc.extractedText.slice(0, 200) + "...",
    highlight: doc.highlight?.slice(0, 2) || [],
  }));

  return NextResponse.json({
    question,
    answer,
    sources,
  });
}

/**
 * Generate a broad answer using GPT's training knowledge about the Epstein case
 */
async function generateBroadAnswer(question: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant on a website that hosts 400,000+ Epstein case documents. 
The user is asking a broad or overview question about the Epstein case.

Answer using your knowledge of publicly available information about the Epstein case — court records, depositions, flight logs, media reporting, and official investigations.

CRITICAL FORMATTING RULES:
- Your response must contain ONLY your analysis text. Nothing else.
- NEVER add a "Sources", "References", or citation list at the end.
- Do NOT say things like "based on publicly available information" or "according to media reports" — just state the facts directly.

Content guidelines:
- Write like an investigative journalist — present facts clearly but don't shy away from suspicious patterns
- Be thorough but concise — cover the key connections, events, and evidence
- If someone had repeated contact with Epstein, say so directly — "close ties", "frequent contact", "repeated visits"
- Highlight suspicious activities, inconsistencies, and concerning patterns
- Use language like "records show...", "notably...", "despite claims of...", "documents reveal..."
- Don't sugarcoat or be overly neutral — if the evidence is damning, say so
- For "how many times" questions, give your best understanding of the scope (e.g., "appears dozens of times across flight logs, contact books, and depositions") rather than a fake exact number
- Always be factual — never fabricate — but draw reasonable inferences from known evidence
- Keep your answer focused and substantive, around 200-400 words`,
      },
      {
        role: "user",
        content: question,
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  return completion.choices[0]?.message?.content || "Unable to generate a response.";
}

/**
 * Fetch a small sample of documents for citations (non-blocking, graceful failure)
 */
async function fetchSmallDocSample(searchTerms: string[]) {
  if (!process.env.APIFY_API_TOKEN) return [];

  try {
    const results = await searchApify(searchTerms, 10);
    return results || [];
  } catch (error) {
    console.error("Small doc search failed (non-critical):", error);
    return []; // Don't fail the whole request if doc search fails
  }
}

/**
 * Extract key search terms from a natural language question
 */
function extractSearchTerms(question: string): string[] {
  const stopWords = new Set([
    "what", "where", "when", "who", "why", "how", "is", "are", "was", "were",
    "did", "does", "do", "the", "a", "an", "in", "on", "at", "to", "for",
    "of", "with", "about", "can", "you", "tell", "me", "find", "show",
    "mentioned", "mention", "appears", "appear", "documents", "files",
    "ever", "any", "there", "been", "have", "has", "and", "or", "but",
    "this", "that", "these", "those", "from", "into", "which", "their",
    "many", "times", "often", "much",
  ]);

  // First, try to find proper names (consecutive capitalized words)
  const properNamePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const properNames: string[] = [];
  let match;
  while ((match = properNamePattern.exec(question)) !== null) {
    properNames.push(match[1].toLowerCase());
  }

  // Check for known notable names and locations
  const notableTerms = [
    "bill gates", "donald trump", "bill clinton", "hillary clinton",
    "prince andrew", "alan dershowitz", "ghislaine maxwell", "les wexner",
    "stephen hawking", "elon musk", "kevin spacey", "chris tucker",
    "virginia giuffre", "virginia roberts", "jeffrey epstein",
    "howard lutnik", "howard lutnick",
    "palm beach", "little st. james", "zorro ranch", "flight logs",
    "island", "plane", "lolita express", "mansion", "ranch",
  ];

  const questionLower = question.toLowerCase();
  const foundTerms = notableTerms.filter(term => questionLower.includes(term));

  const allTerms = [...new Set([...properNames, ...foundTerms])];

  if (allTerms.length > 0) {
    return allTerms;
  }

  // Fallback: extract non-stop words
  const words = question.toLowerCase()
    .replace(/[?.,!']/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  if (words.length === 0) {
    return ["epstein"];
  }

  return [words.slice(0, 3).join(" ")];
}
