/**
 * Agent Creator 表单配置
 * 
 * 定义不同意图类型的表单字段配置
 */

export type FormFieldType = "text" | "textarea" | "select" | "number" | "array";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  min?: number;
  max?: number;
  defaultValue?: any;
}

export interface FormConfig {
  intent: string;
  title: string;
  description?: string;
  fields: FormField[];
}

/**
 * Vocab 单词视频表单配置
 */
export const vocabFormConfig: FormConfig = {
  intent: "create_vocab_video",
  title: "单词视频配置",
  description: "请提供要学习的单词和相关配置",
  fields: [
    {
      name: "words",
      type: "textarea",
      label: "单词列表",
      required: true,
      placeholder: "每行一个单词，或逗号分隔\n例如：apple, banana, cat",
    },
    {
      name: "difficulty",
      type: "select",
      label: "难度级别",
      required: false,
      defaultValue: "easy",
      options: [
        { label: "简单 (小学)", value: "easy" },
        { label: "中等 (初中)", value: "medium" },
        { label: "困难 (高中)", value: "hard" },
      ],
    },
    {
      name: "sentence_level",
      type: "select",
      label: "句子复杂度",
      required: false,
      defaultValue: "simple",
      options: [
        { label: "简单句", value: "simple" },
        { label: "复杂句", value: "complex" },
      ],
    },
    {
      name: "repetitions",
      type: "number",
      label: "重复次数",
      required: false,
      min: 1,
      max: 5,
      defaultValue: 2,
    },
    {
      name: "style",
      type: "select",
      label: "视频风格",
      required: false,
      defaultValue: "anime",
      options: [
        { label: "动漫风格", value: "anime" },
        { label: "写实风格", value: "realism" },
        { label: "迪士尼/皮克斯", value: "disney" },
      ],
    },
  ],
};

/**
 * 表单配置映射表
 */
export const formConfigs: Record<string, FormConfig> = {
  create_vocab_video: vocabFormConfig,
  // 未来扩展其他 Agent
  // create_story_video: storyFormConfig,
  // create_dialogue_video: dialogueFormConfig,
};

/**
 * 根据意图获取表单配置
 */
export function getFormConfig(intent: string): FormConfig | null {
  return formConfigs[intent] || null;
}

/**
 * 将提取的参数转换为表单初始值
 */
export function paramsToFormValues(
  config: FormConfig,
  params: Record<string, any>
): Record<string, any> {
  const values: Record<string, any> = {};

  config.fields.forEach((field) => {
    const paramValue = params[field.name];

    if (paramValue !== undefined && paramValue !== null) {
      // 特殊处理数组类型（如 words）
      if (field.type === "textarea" && Array.isArray(paramValue)) {
        values[field.name] = paramValue.join(", ");
      } else {
        values[field.name] = paramValue;
      }
    } else {
      // 使用默认值
      values[field.name] = field.defaultValue;
    }
  });

  return values;
}

/**
 * 将表单值转换为 API 参数
 */
export function formValuesToParams(
  config: FormConfig,
  values: Record<string, any>
): Record<string, any> {
  const params: Record<string, any> = {};

  config.fields.forEach((field) => {
    const value = values[field.name];

    if (value !== undefined && value !== null && value !== "") {
      // 特殊处理 textarea 类型的 words
      if (field.name === "words" && typeof value === "string") {
        params[field.name] = value
          .split(/[\n,，]/)
          .map((w) => w.trim())
          .filter(Boolean);
      } else {
        params[field.name] = value;
      }
    }
  });

  return params;
}
