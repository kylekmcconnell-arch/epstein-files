import { NextRequest, NextResponse } from "next/server";
import { searchApify } from "@/lib/apify";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json(
        { error: "Search API not configured" },
        { status: 500 }
      );
    }

    // Extract key terms from the question for search
    const searchTerms = extractSearchTerms(question);
    
    // Search Apify for relevant documents
    let results;
    try {
      results = await searchApify(searchTerms, 50);
    } catch (error: any) {
      console.error("Apify search failed:", error);
      return NextResponse.json({
        question,
        answer: "I'm having trouble searching the documents right now. Please try again in a moment.",
        sources: [],
      });
    }

    if (!results || results.length === 0) {
      // Check if the question seems like an opinion/subjective question
      const opinionPatterns = /\b(guilty|innocent|worst|best|think|opinion|feel|believe|most evil|bad person|good person|blame|fault|responsible)\b/i;
      const isOpinionQuestion = opinionPatterns.test(question);

      const answer = isOpinionQuestion
        ? `I'm a document search tool — I can't form opinions or make judgments about guilt or innocence. I can only search and summarize what's in the 400,000+ released court documents, depositions, and evidence files.\n\nTry asking me something specific, like:\n• "What did [person's name] say in their deposition?"\n• "What evidence was presented about [specific topic]?"\n• "What do the flight logs show about [person]?"\n\nThe more specific your question, the better results I can find.`
        : `I couldn't find documents matching that query. I can only search the released Epstein case files — I work best with specific names, dates, locations, or events.\n\nTry something like:\n• "What did Virginia Giuffre say about Prince Andrew?"\n• "Who is mentioned in the flight logs?"\n• "What happened at the Palm Beach residence?"`;

      return NextResponse.json({
        question,
        answer,
        sources: [],
      });
    }

    // Build context from search results
    const context = results
      .slice(0, 25) // Limit context to top 25 results
      .map((doc, i) => `[Document ${i + 1}: ${doc.originFileName}]\n${doc.extractedText.slice(0, 1500)}`)
      .join("\n\n---\n\n");

    // Generate answer using GPT
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
- Be factual and objective — do not speculate beyond what the documents state
- Keep your answer concise and focused
- For sensitive topics, maintain a neutral, journalistic tone
- If the user asks for your opinion, judgment, or who is "guilty"/"innocent"/"worst"/etc., do NOT give an opinion. Instead, explain that you are a document search tool and can only present what the files contain. Then summarize the most relevant factual findings from the documents and suggest more specific questions the user could ask.`,
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
    
    // Safety net: strip any "Sources" section GPT may have added despite instructions
    answer = answer.replace(/\n\n(?:\*\*)?(?:Sources|References|Documents? cited|Citations?)(?:\*\*)?:?\s*\n[\s\S]*$/i, '').trim();

    // Format sources
    const sources = results.slice(0, 25).map((doc) => ({
      filename: doc.originFileName,
      sourceUrl: doc.originFileUri,
      excerpt: doc.extractedText.slice(0, 200) + "...",
      highlight: doc.highlight.slice(0, 2),
    }));

    return NextResponse.json({
      question,
      answer,
      sources,
    });
  } catch (error: any) {
    console.error("Ask error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process question" },
      { status: 500 }
    );
  }
}

/**
 * Extract key search terms from a natural language question
 */
function extractSearchTerms(question: string): string[] {
  // Only filter out very common question words, keep meaningful terms
  const stopWords = new Set([
    "what", "where", "when", "who", "why", "how", "is", "are", "was", "were",
    "did", "does", "do", "the", "a", "an", "in", "on", "at", "to", "for",
    "of", "with", "about", "can", "you", "tell", "me", "find", "show",
    "mentioned", "mention", "appears", "appear", "documents", "files",
    "ever", "any", "there", "been", "have", "has", "and", "or", "but",
    "this", "that", "these", "those", "from", "into", "which", "their",
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

  // Combine proper names found in question with notable terms
  const allTerms = [...new Set([...properNames, ...foundTerms])];
  
  if (allTerms.length > 0) {
    return allTerms;
  }

  // Fallback: extract non-stop words
  const words = question.toLowerCase()
    .replace(/[?.,!']/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Always return at least one term
  if (words.length === 0) {
    // Last resort: use a generic search term from the question
    return ["epstein"];
  }

  // Return meaningful keywords (combine into a phrase for better results)
  return [words.slice(0, 3).join(" ")];
}
