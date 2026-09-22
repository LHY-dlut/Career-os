import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface MultiTurnChatResult {
  reply: string;
  modelUsed: string;
  groundingSources?: GroundingSource[];
  webSearchQueries?: string[];
}

export async function runMultiTurnChat(params: {
  messages: ChatMessage[];
  systemInstruction?: string;
  model?: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
  enableSearch?: boolean;
}): Promise<MultiTurnChatResult> {
  const {
    messages,
    systemInstruction,
    model = 'gemini-3.5-flash',
    enableSearch = false,
  } = params;

  // Search grounding is explicitly powered by gemini-3.5-flash with googleSearch tool
  const effectiveModel = enableSearch ? 'gemini-3.5-flash' : model;

  const ai = getAI();
  if (!ai) {
    const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || 'Hello';
    return {
      reply: `### AI Career OS Assistant (Offline Demo Mode)\n\n` +
        `**Model Active:** \`${effectiveModel}\`\n` +
        `**Role / Instruction:** ${systemInstruction ? 'Specialized Persona Loaded' : 'General AI Mentor'}\n` +
        (enableSearch ? `**Search Grounding:** Google Search Grounding Enabled\n\n` : '\n') +
        `Regarding your query: *"**${lastUserMsg}**"*\n\n` +
        `In LLM, RAG, and AI agent engineering, mastering this topic involves evaluating computational complexity, memory bottlenecks (such as KV cache growth in autoregressive decoders), and retrieval fidelity.\n\n` +
        `- **Algorithmic Consideration**: Ensure mathematical clarity in loss formulations and attention mechanisms.\n` +
        `- **System Architecture**: Optimize memory bandwidth and GPU compute saturation using modern kernels (FlashAttention, PagedAttention).\n` +
        `- **Production Deployment**: Implement continuous batching and quantization (FP8/INT4) for low latency.\n\n` +
        `*To connect live Gemini intelligence, set your \`GEMINI_API_KEY\` in your environment or Secrets.*`,
      modelUsed: effectiveModel,
      groundingSources: enableSearch
        ? [
            {
              title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
              url: 'https://arxiv.org/abs/2205.14135',
            },
            {
              title: 'vLLM: High-Throughput and Memory-Efficient LLM Serving',
              url: 'https://github.com/vllm-project/vllm',
            },
          ]
        : undefined,
      webSearchQueries: enableSearch ? [lastUserMsg.slice(0, 60)] : undefined,
    };
  }

  // Format messages for @google/genai contents
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (enableSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await ai.models.generateContent({
      model: effectiveModel,
      contents,
      config,
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;

    const groundingSources: GroundingSource[] = [];
    if (Array.isArray(rawChunks)) {
      for (const chunk of rawChunks) {
        if (chunk?.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    return {
      reply: response.text || 'No response generated.',
      modelUsed: effectiveModel,
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      webSearchQueries: searchQueries && searchQueries.length > 0 ? searchQueries : undefined,
    };
  } catch (err: any) {
    console.warn(`Primary model ${effectiveModel} error:`, err.message || err);
    // If rate limited, 503 high demand, or billing restriction, attempt resilient fallback
    const fallbackModel = effectiveModel === 'gemini-3.1-pro-preview' ? 'gemini-3.5-flash' : 'gemini-2.5-flash';
    try {
      console.info(`Attempting fallback to ${fallbackModel}...`);
      const fallbackResponse = await ai.models.generateContent({
        model: fallbackModel,
        contents,
        config: {
          ...config,
          systemInstruction: (systemInstruction || '') + `\n(Note: Responding via resilient ${fallbackModel} engine)`,
        },
      });

      const rawChunks = fallbackResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const searchQueries = fallbackResponse.candidates?.[0]?.groundingMetadata?.webSearchQueries;
      const groundingSources: GroundingSource[] = [];
      if (Array.isArray(rawChunks)) {
        for (const chunk of rawChunks) {
          if (chunk?.web?.uri) {
            groundingSources.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri,
            });
          }
        }
      }

      return {
        reply: fallbackResponse.text || 'No response generated.',
        modelUsed: `${fallbackModel} (auto-fallback)`,
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
        webSearchQueries: searchQueries && searchQueries.length > 0 ? searchQueries : undefined,
      };
    } catch (fallbackErr: any) {
      console.error('Fallback model failed too:', fallbackErr.message);
      throw err;
    }
  }
}

export async function researchTopicWithSearch(topic: string): Promise<{
  content: string;
  groundingSources: GroundingSource[];
  webSearchQueries?: string[];
}> {
  const ai = getAI();
  if (!ai) {
    return {
      content: `### Latest Research & SOTA Industry Developments: ${topic}\n\n` +
        `Recent 2024-2025 engineering advancements demonstrate rapid adoption of speculative decoding, hybrid state-space models (Mamba-Transformer hybrids), and FP8/INT4 KV-cache compression.\n\n` +
        `Top production teams prioritize Time-To-First-Token (TTFT) and high-concurrency throughput over raw parameter scale.`,
      groundingSources: [
        { title: 'arXiv CS.AI Recent Submissions', url: 'https://arxiv.org/list/cs.AI/recent' },
        { title: 'vLLM GitHub & Technical Reports', url: 'https://github.com/vllm-project/vllm' },
      ],
      webSearchQueries: [`${topic} LLM papers 2024 2025`],
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `You are an AI Research Scientist and LLM Systems Architect.
Perform a search-grounded deep dive into the latest 2024-2025 real-world developments, breakthrough papers, industry benchmarks, and production standards for: "${topic}".

Format your response in structured Markdown:
1. **Latest Breakthroughs & Papers (2024-2025)**: Cite notable labs, architectures, or papers.
2. **Current Production Standards (SOTA)**: How leading tech companies implement this today.
3. **Core Engineering & Latency Trade-offs**: Hardware bottlenecks, memory bandwidth, compute.
4. **Key Interview Probing Angles**: What top interviewers will test regarding this topic.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;

  const groundingSources: GroundingSource[] = [];
  if (Array.isArray(rawChunks)) {
    for (const chunk of rawChunks) {
      if (chunk?.web?.uri) {
        groundingSources.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
        });
      }
    }
  }

  return {
    content: response.text || 'No research summary generated.',
    groundingSources,
    webSearchQueries: searchQueries,
  };
}

export async function explainTopic(content: string, contextTitle?: string): Promise<string> {
  const ai = getAI();
  if (!ai) {
    return `[Offline Demo Mode] Here is an architectural explanation of "${contextTitle || 'the selected topic'}":\n\n` +
      `In large-scale AI engineering, this concept is central to efficiency and quality. ` +
      `Key principles include mathematical scaling properties, memory footprint trade-offs during autoregressive inference or retrieval, ` +
      `and proper handling of edge cases in production.\n\n` +
      `*Content summary reviewed*: ${content.slice(0, 200)}...`;
  }

  const prompt = `You are a Principal AI Algorithm Engineer and Interview Bar Raiser at a top tech company.
Explain the following technical topic clearly, thoroughly, and with deep engineering precision. Include core mathematical intuition, hardware/GPU memory bottlenecks, and practical trade-offs:

Topic Title: ${contextTitle || 'Concept'}
Context Details:
${content}

Format your response in clean Markdown with appropriate headings, bullet points, and equations if applicable.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
  });

  return response.text || 'No response generated.';
}

export interface AnswerImprovementResult {
  missingPoints: string[];
  inaccuracies: string[];
  betterStructure: string;
  thirtySecondAnswer: string;
  followUps: string[];
}

export async function improveInterviewAnswer(
  question: string,
  myAnswer: string
): Promise<AnswerImprovementResult> {
  const ai = getAI();
  if (!ai) {
    return {
      missingPoints: [
        'Mention variance proof for sqrt(d_k) scaling to show mathematical depth.',
        'Address memory bandwidth versus compute saturation in GPU HBM.',
      ],
      inaccuracies: [
        'Ensure exact distinction between sequence length quadratic cost and dimension linear cost.',
      ],
      betterStructure:
        '1. Direct definition / 1-sentence conclusion\n2. Underlying mathematical/system bottleneck\n3. Practical engineering trade-offs and modern standard variants',
      thirtySecondAnswer:
        'Start with the core purpose (e.g. preventing softmax gradient vanishing or reducing KV cache memory), follow with the formula, and finish with how modern models adopt it.',
      followUps: [
        'How does this change under FP8 or INT4 quantization?',
        'Can you trace the tensor dimensions during the forward pass?',
      ],
    };
  }

  const prompt = `You are an AI Algorithm Interviewer evaluating a candidate's answer for an LLM / RAG / Agent engineering position.

Question:
${question}

Candidate's Answer:
${myAnswer}

Evaluate the candidate's answer rigorously. Provide constructive feedback in structured JSON format with:
1. missingPoints: array of technical points or context that the candidate missed.
2. inaccuracies: array of any factual or mathematical inaccuracies.
3. betterStructure: a clear outline of how an ideal candidate would structure this response.
4. thirtySecondAnswer: an exemplary 30-second elevator-pitch answer.
5. followUps: array of 3 realistic follow-up questions an interviewer would ask.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          inaccuracies: { type: Type.ARRAY, items: { type: Type.STRING } },
          betterStructure: { type: Type.STRING },
          thirtySecondAnswer: { type: Type.STRING },
          followUps: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'missingPoints',
          'inaccuracies',
          'betterStructure',
          'thirtySecondAnswer',
          'followUps',
        ],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      missingPoints: parsed.missingPoints || [],
      inaccuracies: parsed.inaccuracies || [],
      betterStructure: parsed.betterStructure || '',
      thirtySecondAnswer: parsed.thirtySecondAnswer || '',
      followUps: parsed.followUps || [],
    };
  } catch {
    return {
      missingPoints: ['Review mathematical scaling factors.'],
      inaccuracies: [],
      betterStructure: 'Conclusion -> Mechanism -> System Bottlenecks -> Industry Solutions',
      thirtySecondAnswer: response.text || '',
      followUps: ['What are the practical deployment bottlenecks?'],
    };
  }
}

export interface JDAnalysisResult {
  coreRequirements: string[];
  importantSkills: string[];
  likelyInterviewTopics: string[];
  knowledgeGaps: string[];
  relevantKnowledgeArticles: string[];
  relevantQuestionBankEntries: string[];
  suggestedPreparationChecklist: string[];
}

export async function analyzeJobDescription(
  jdText: string,
  availableKnowledgeTitles: string[],
  availableQuestionTitles: string[]
): Promise<JDAnalysisResult> {
  const ai = getAI();
  if (!ai) {
    return {
      coreRequirements: [
        'Deep understanding of Transformer attention mechanisms and decoder-only LLM architectures',
        'Hands-on experience with RAG hybrid retrieval (BM25 + Dense vector search + Reranker)',
        'Familiarity with autonomous Agent patterns (ReAct, tool calling, memory management)',
      ],
      importantSkills: [
        'PyTorch / CUDA inference optimization (KV Cache, FlashAttention, vLLM)',
        'Evaluation frameworks (RAGAS, prompt engineering, benchmark suites)',
      ],
      likelyInterviewTopics: [
        'MHA vs GQA trade-offs in low-latency decoding',
        'RRF rank fusion parameter tuning in hybrid search',
        'Agent reflection and self-correction workflows',
      ],
      knowledgeGaps: [
        'Review RoPE relative positional encoding math and long-context scaling (YaRN, NTK)',
        'Quantization strategies: NF4 and Double Quantization in QLoRA',
      ],
      relevantKnowledgeArticles: availableKnowledgeTitles.slice(0, 3),
      relevantQuestionBankEntries: availableQuestionTitles.slice(0, 3),
      suggestedPreparationChecklist: [
        'Re-derive self-attention variance proof on whiteboard',
        'Practice coding Multi-Head Attention forward pass from scratch',
        'Prepare 2 deep-dive project stories highlighting technical challenges and trade-offs',
      ],
    };
  }

  const prompt = `You are a Career Coach and Technical Hiring Bar Raiser for AI Algorithm Engineers.
Analyze the following Job Description (JD):

Job Description:
${jdText}

Available Knowledge Articles in App:
${JSON.stringify(availableKnowledgeTitles)}

Available Questions in App:
${JSON.stringify(availableQuestionTitles)}

Extract structured insights. Note: ONLY reference relevant knowledge articles and questions that actually appear in the provided lists above; DO NOT hallucinate nonexistent titles.

Provide:
1. coreRequirements: array of 3-5 core technical requirements.
2. importantSkills: array of technical tools/frameworks needed.
3. likelyInterviewTopics: array of specific technical topics likely asked in interviews.
4. knowledgeGaps: array of tricky/niche knowledge areas candidates typically miss.
5. relevantKnowledgeArticles: array of exact matching titles from the available knowledge articles list.
6. relevantQuestionBankEntries: array of exact matching titles from the available question list.
7. suggestedPreparationChecklist: array of actionable study tasks.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          importantSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          likelyInterviewTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          knowledgeGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          relevantKnowledgeArticles: { type: Type.ARRAY, items: { type: Type.STRING } },
          relevantQuestionBankEntries: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedPreparationChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'coreRequirements',
          'importantSkills',
          'likelyInterviewTopics',
          'knowledgeGaps',
          'relevantKnowledgeArticles',
          'relevantQuestionBankEntries',
          'suggestedPreparationChecklist',
        ],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      coreRequirements: parsed.coreRequirements || [],
      importantSkills: parsed.importantSkills || [],
      likelyInterviewTopics: parsed.likelyInterviewTopics || [],
      knowledgeGaps: parsed.knowledgeGaps || [],
      relevantKnowledgeArticles: parsed.relevantKnowledgeArticles || [],
      relevantQuestionBankEntries: parsed.relevantQuestionBankEntries || [],
      suggestedPreparationChecklist: parsed.suggestedPreparationChecklist || [],
    };
  } catch {
    return {
      coreRequirements: ['Foundation Model Theory', 'RAG Retrieval Systems', 'Agent Tool Calling'],
      importantSkills: ['PyTorch', 'Vector DB', 'Evaluation Frameworks'],
      likelyInterviewTopics: ['Attention scaling', 'KV Cache bottlenecks', 'Hybrid search fusion'],
      knowledgeGaps: ['Hardware-aware memory analysis'],
      relevantKnowledgeArticles: availableKnowledgeTitles.slice(0, 2),
      relevantQuestionBankEntries: availableQuestionTitles.slice(0, 2),
      suggestedPreparationChecklist: ['Review core mathematical proofs', 'Complete Coding Lab'],
    };
  }
}

export interface MockInterviewTurnResult {
  feedback: string;
  nextQuestion: string;
  scoreOutOf10?: number;
  isComplete?: boolean;
}

export async function runMockInterviewTurn(
  topic: string,
  history: Array<{ role: 'interviewer' | 'candidate'; content: string }>,
  candidateAnswer?: string
): Promise<MockInterviewTurnResult> {
  const ai = getAI();
  if (!ai) {
    if (!candidateAnswer) {
      return {
        feedback: 'Welcome to your mock interview! Let us begin with core fundamentals.',
        nextQuestion: `In ${topic}, can you explain the primary architectural trade-offs when optimizing for low-latency inference in production?`,
      };
    }
    return {
      feedback: 'Good overview of the trade-offs! You correctly highlighted memory bandwidth limits. To improve, mention specific numbers or kernel-level optimizations like PagedAttention or FlashAttention.',
      nextQuestion: `Let's dig deeper: how would you handle out-of-distribution or noisy inputs in this architecture without degrading overall latency?`,
      scoreOutOf10: 8,
    };
  }

  const prompt = `You are an expert AI Algorithm Engineering Interviewer at a premier lab conducting a live technical interview on: "${topic}".

Conversation History:
${history.map((h) => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}

Latest Candidate Answer:
${candidateAnswer || '(Starting the interview session)'}

Instructions:
1. If this is the start (no candidate answer), introduce the interview in 1 friendly sentence and ask the first rigorous, realistic question.
2. If the candidate answered, provide:
   - Brief, sharp, technical feedback (strengths & missing depth).
   - A score out of 10 for this answer.
   - The next progressive technical question (either drilling deeper into their answer or moving to the next core concept).
3. Keep the tone professional, encouraging, but technically uncompromising.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING },
          nextQuestion: { type: Type.STRING },
          scoreOutOf10: { type: Type.NUMBER },
          isComplete: { type: Type.BOOLEAN },
        },
        required: ['feedback', 'nextQuestion'],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      feedback: parsed.feedback || 'Answer recorded.',
      nextQuestion: parsed.nextQuestion || 'Could you elaborate on the practical implementation details?',
      scoreOutOf10: parsed.scoreOutOf10,
      isComplete: parsed.isComplete || false,
    };
  } catch {
    return {
      feedback: 'Clear explanation of the core principles.',
      nextQuestion: 'How would you measure the performance of this system under heavy concurrent load?',
      scoreOutOf10: 7,
    };
  }
}
