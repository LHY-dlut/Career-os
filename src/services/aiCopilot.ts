import type {
  AnswerImprovementResult,
  JDAnalysisResult,
  MockInterviewTurnResult,
  ChatMessage,
  GroundingSource,
  MultiTurnChatResult,
} from '../server/geminiService';

export type { ChatMessage, GroundingSource, MultiTurnChatResult };

export async function requestMultiTurnChat(params: {
  messages: ChatMessage[];
  systemInstruction?: string;
  model?: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
  enableSearch?: boolean;
}): Promise<MultiTurnChatResult> {
  const res = await fetch('/api/copilot/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return await res.json();
}

export async function requestSearchResearch(topic: string): Promise<{
  content: string;
  groundingSources: GroundingSource[];
  webSearchQueries?: string[];
}> {
  const res = await fetch('/api/copilot/search-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return await res.json();
}

export async function requestExplain(content: string, contextTitle?: string): Promise<string> {
  const res = await fetch('/api/copilot/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, contextTitle }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.explanation;
}

export async function requestImproveAnswer(
  question: string,
  myAnswer: string
): Promise<AnswerImprovementResult> {
  const res = await fetch('/api/copilot/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, myAnswer }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return await res.json();
}

export async function requestJDAnalyze(
  jdText: string,
  availableKnowledgeTitles: string[] = [],
  availableQuestionTitles: string[] = []
): Promise<JDAnalysisResult> {
  const res = await fetch('/api/copilot/jd-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jdText,
      availableKnowledgeTitles,
      availableQuestionTitles,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return await res.json();
}

export async function requestMockInterviewTurn(
  topic: string,
  history: Array<{ role: 'interviewer' | 'candidate'; content: string }>,
  candidateAnswer?: string
): Promise<MockInterviewTurnResult> {
  const res = await fetch('/api/copilot/mock-interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, history, candidateAnswer }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return await res.json();
}

// Higher-level UI helper functions used by AICopilot.tsx
export async function chatWithCopilot(prompt: string, _history: any[] = []): Promise<string> {
  // Pass to server explain endpoint
  return await requestExplain(prompt, 'AI Career OS Tutor');
}

export async function polishElevatorPitch(roughAnswer: string, question: string): Promise<string> {
  const result = await requestImproveAnswer(question, roughAnswer);
  return `### ⚡ 30-Second Elevator Pitch
${result.thirtySecondAnswer}

---

### 🏛️ Recommended Answer Structure
${result.betterStructure}

---

### 🔍 Missing Technical Nuances & Inaccuracies
${result.missingPoints.map((p) => `- ${p}`).join('\n')}
${result.inaccuracies.length > 0 ? `\n**Watch out for:**\n${result.inaccuracies.map((i) => `- ${i}`).join('\n')}` : ''}

---

### 🎙️ Expected Follow-Up Probing Questions
${result.followUps.map((f, idx) => `${idx + 1}. ${f}`).join('\n')}`;
}

export async function generateMockQuestion(topic: string, _difficulty: string): Promise<{
  question: string;
  conciseAnswer: string;
  detailedAnswer: string;
  followUps: string[];
}> {
  const turn = await requestMockInterviewTurn(topic, [], undefined);
  return {
    question: turn.nextQuestion,
    conciseAnswer: turn.feedback || 'Provide a crisp high-level definition followed by hardware and mathematical trade-offs.',
    detailedAnswer: 'Structure: 1. Core Principle 2. Mathematical formulation 3. Memory & GPU bottlenecks 4. Production standard choices (e.g. FlashAttention, vLLM, GQA).',
    followUps: [
      'What are the memory bandwidth vs compute saturation trade-offs?',
      'How does this behave under FP8 or INT4 quantization in production?',
    ],
  };
}

export async function analyzeJobDescription(jdText: string): Promise<string> {
  const result = await requestJDAnalyze(jdText);
  return `### 🎯 High-Yield Required Competencies
${result.coreRequirements.map((c) => `- **${c}**`).join('\n')}

---

### 🛠️ Key Technical Tools & Stack
${result.importantSkills.map((s) => `- ${s}`).join('\n')}

---

### 📋 Predicted Technical Interview Questions
${result.likelyInterviewTopics.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---

### ⚠️ Common Candidate Knowledge Gaps
${result.knowledgeGaps.map((g) => `- ${g}`).join('\n')}

---

### 🚀 Recommended Preparation Checklist
${result.suggestedPreparationChecklist.map((task, i) => `${i + 1}. ${task}`).join('\n')}`;
}
