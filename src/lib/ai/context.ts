import {
  getAllPrerequisites,
  getKnowledgeNode,
  knowledgeNodes,
} from "@/lib/knowledge-graph";

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

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

interface FocusedKnowledgeContextOptions {
  knowledgeIds: string[];
  includePrerequisites?: boolean;
  maxKeywordsPerNode?: number;
}

export function buildFocusedKnowledgeContext({
  knowledgeIds,
  includePrerequisites = true,
  maxKeywordsPerNode = 3,
}: FocusedKnowledgeContextOptions): string {
  const scopedIds = unique(
    knowledgeIds.flatMap((id) =>
      includePrerequisites ? [...getAllPrerequisites(id), id] : [id]
    )
  );
  const nodes = scopedIds
    .map((id) => getKnowledgeNode(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name));

  if (nodes.length === 0) {
    return "无可用知识点上下文。";
  }

  return [
    "## 相关知识点摘要",
    ...nodes.map((node) => {
      const parts = [
        `${node.name} [${node.id}]`,
        `模块: ${node.module}`,
        `难度: ${node.difficulty}`,
      ];

      if (node.prerequisites.length > 0) {
        parts.push(`前置: ${node.prerequisites.join(", ")}`);
      }

      if (node.keywords.length > 0) {
        parts.push(
          `关键词: ${node.keywords.slice(0, maxKeywordsPerNode).join(", ")}`
        );
      }

      return `- ${parts.join(" | ")}`;
    }),
  ].join("\n");
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
