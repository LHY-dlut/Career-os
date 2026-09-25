import type { LibraryResource } from '../content/library/types';

// This editorial association is independent from the upstream import and its provenance.
const associations: Record<string, string[]> = {
  'aiinfra-guide-6b76589b9952fa4f': ['torch-tensor-shapes', 'torch-softmax'],
  'aiinfra-guide-5328322073d0c2f3': ['torch-attention', 'torch-masks', 'torch-mha'],
  'aiinfra-guide-8922413ce246bd71': ['torch-ffn'],
  'aiinfra-guide-c732a9479b9933b6': ['torch-sinusoidal', 'torch-rope'],
  'aiinfra-guide-09d48d37033129c9': ['torch-norm', 'torch-residual'],
  'aiinfra-guide-a5865c19672660ac': ['torch-decoder'],
  'aiinfra-guide-6a491f1a225ce1da': ['torch-kv-cache', 'torch-gqa'],
  'aiinfra-guide-bc9237c2c72b1d2b': ['torch-embedding'],
  'aris-ai-offer-attention-tutorial': ['torch-attention', 'torch-masks', 'torch-mha'],
  'aris-ai-offer-transformer-block-tutorial': ['torch-decoder', 'torch-norm', 'torch-ffn'],
  'aris-ai-offer-long-context-rope-yarn-mla-tutorial': ['torch-rope', 'torch-gqa'],
  'aris-ai-offer-kv-cache-speculative-decoding-tutorial': ['torch-kv-cache', 'torch-gqa'],
  'aris-ai-offer-tokenization-tutorial': ['torch-embedding'],
  'aris-ai-offer-normalization-init-tutorial': ['torch-norm', 'torch-residual'],
  'kamacoder-transformer': ['torch-attention', 'torch-decoder'],
};
const titles: Record<string, [string, string]> = {
  'torch-tensor-shapes': ['张量形状与变换', 'Tensor shapes and transforms'],
  'torch-softmax': ['数值稳定的 Softmax', 'Numerically stable softmax'],
  'torch-embedding': ['词嵌入与索引', 'Token embeddings'],
  'torch-attention': ['缩放点积注意力', 'Scaled dot-product attention'],
  'torch-masks': ['因果掩码与填充掩码', 'Causal and padding masks'],
  'torch-mha': ['多头注意力', 'Multi-head attention'],
  'torch-norm': ['LayerNorm 与 RMSNorm', 'LayerNorm and RMSNorm'],
  'torch-ffn': ['前馈网络与门控', 'Feed-forward networks'],
  'torch-residual': ['残差连接', 'Residual connections'],
  'torch-sinusoidal': ['正弦位置编码', 'Sinusoidal positions'],
  'torch-rope': ['旋转位置编码 RoPE', 'Rotary position embeddings'],
  'torch-decoder': ['完整 Decoder Block', 'A complete decoder block'],
  'torch-kv-cache': ['增量解码与 KV Cache', 'Incremental decoding and KV cache'],
  'torch-gqa': ['分组查询注意力 GQA', 'Grouped-query attention'],
};

export function getLibraryTrainingLinks(resource: LibraryResource) {
  const ids = resource.relatedTrainingIds || associations[resource.translationGroupId || resource.id] || [];
  return [...new Set(ids)].filter(id => Boolean(titles[id])).map(id => ({ id, title: titles[id][0], titleEn: titles[id][1], href: `/coding/${id}?track=pytorch` }));
}

export function getLibraryQuestionCategories(resource: LibraryResource): string[] {
  const terms = `${resource.title} ${resource.category} ${resource.tags.join(' ')}`;
  if (/Text-to-SQL/i.test(terms)) return ['Text-to-SQL'];
  if (/RAG|检索增强/.test(terms)) return ['RAG'];
  if (/Agent|智能体/.test(terms)) return ['Agent'];
  if (/Transformer|Attention|注意力|Decoder|RoPE|位置编码|归一化|前馈/i.test(terms)) return ['Transformer'];
  if (/KV Cache|推理优化|推理服务|量化/.test(terms)) return ['Inference'];
  if (/LLM|大语言|预训练|微调|RLHF|DPO|GRPO/.test(terms)) return ['LLM'];
  return [];
}
