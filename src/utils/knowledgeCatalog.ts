import type { KnowledgeArticle } from '../types';

const categories = ['01 Transformer', '02 LLM', '03 RAG', '04 Agent', '05 Text-to-SQL', '06 Machine Learning', '07 Deep Learning', '08 NLP'];
const descriptions: Record<string, [string, string]> = {
  '01 Transformer': ['Attention, position encoding and the building blocks of modern models.', '从注意力机制、位置编码到模型架构，理解现代大模型的基础。'],
  '02 LLM': ['Pretraining, fine-tuning, alignment and efficient model inference.', '梳理预训练、微调、对齐与高效推理，建立大语言模型知识体系。'],
  '03 RAG': ['Retrieval, ranking, evaluation and answers grounded in your knowledge.', '连接检索、排序与评估，构建有依据的知识问答系统。'],
  '04 Agent': ['Tool use, planning and reliable agent workflows.', '学习工具调用、任务规划与执行，理解智能体的工程实践。'],
  '05 Text-to-SQL': ['Schema understanding, query generation and execution feedback.', '从数据库结构理解到 SQL 生成，用执行反馈改进查询。'],
  '06 Machine Learning': ['Core methods, evaluation and the mathematical foundations of learning.', '回顾经典算法、模型评估与数学基础，巩固算法工程能力。'],
  '07 Deep Learning': ['Neural networks, optimization and practical training techniques.', '掌握神经网络、优化方法与训练技巧，串起理论和实践。'],
  '08 NLP': ['Language representation, text processing and applied language tasks.', '探索语言表示、文本处理与自然语言任务，理解技术演进。'],
};

export function getKnowledgeCategories(articles: Pick<KnowledgeArticle, 'category'>[]): string[] {
  return [...categories, ...[...new Set(articles.map(article => article.category))].filter(category => !categories.includes(category)).sort((a, b) => a.localeCompare(b))];
}

export function knowledgeCategoryPath(category: string): string {
  return `/knowledge?category=${encodeURIComponent(category)}`;
}

export function getCategoryDescription(category: string, language: 'zh' | 'en'): string {
  const description = descriptions[category] || ['Your collected notes, explanations and practical experience in this topic.', '整理这个主题下的学习笔记、技术解释与实践经验。'];
  return description[language === 'zh' ? 1 : 0];
}
