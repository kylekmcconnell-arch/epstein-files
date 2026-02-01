import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

export async function askQuestion(
  question: string,
  context: { content: string; documentId: string; pageNumber?: number | null }[]
): Promise<string> {
  const contextText = context
    .map(
      (c, i) =>
        `[Source ${i + 1}${c.pageNumber ? `, Page ${c.pageNumber}` : ""}]\n${c.content}`
    )
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an assistant that answers questions about the Epstein court documents. 
Answer based ONLY on the provided document excerpts. 
If the answer is not found in the documents, say so clearly.
Always cite which source number(s) you used for your answer.
Be factual and objective. Do not speculate beyond what the documents state.`,
      },
      {
        role: "user",
        content: `Based on the following document excerpts, please answer this question: "${question}"

DOCUMENT EXCERPTS:
${contextText}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "Unable to generate a response.";
}

export default openai;
