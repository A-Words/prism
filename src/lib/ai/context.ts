import { knowledgeNodes } from "@/lib/knowledge-graph";

/**
 * 构建知识图谱上下文，用于 AI 提示词
 */
export function buildKnowledgeContext(): string {
  const categories = new Map<string, typeof knowledgeNodes>();
  for (const node of knowledgeNodes) {
    const list = categories.get(node.module) || [];
    list.push(node);
    categories.set(node.module, list);
  }

  let context = "## 高中数学知识图谱\n\n";

  for (const [module, nodes] of categories) {
    context += `### ${module}\n`;
    for (const node of nodes) {
      context += `- **${node.name}** (ID: ${node.id}, 分类: ${node.category}, 难度: ${node.difficulty})\n`;
      context += `  描述: ${node.description}\n`;
      if (node.prerequisites.length > 0) {
        context += `  前置知识: ${node.prerequisites.join(", ")}\n`;
      }
    }
    context += "\n";
  }

  return context;
}

/**
 * 获取 AI 模型配置
 */
export function getModelConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || "",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL || "gpt-4o",
  };
}

/**
 * 检查 AI 是否配置
 */
export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
