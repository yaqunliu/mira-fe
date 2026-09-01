/**
 * Agent Creator 表单配置
 * 
 * 定义不同意图类型的表单字段配置
 */

export type FormFieldType = "text" | "textarea" | "select" | "number" | "array";

export interface FormFieldOption {
  /** i18n key（agentForm 命名空间），不是文案本身 */
  labelKey: string;
  value: string;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  /** i18n key（agentForm 命名空间），不是文案本身 */
  labelKey: string;
  required: boolean;
  /** i18n key（agentForm 命名空间） */
  placeholderKey?: string;
  options?: FormFieldOption[];
  min?: number;
  max?: number;
  defaultValue?: any;
}

// 本模块非组件，存 i18n key 而非文案；由渲染方 dynamic-form.tsx 调 t() 翻译。
export interface FormConfig {
  intent: string;
  /** i18n key（agentForm 命名空间） */
  titleKey: string;
  /** i18n key（agentForm 命名空间） */
  descriptionKey?: string;
  fields: FormField[];
}

/**
 * Vocab 单词视频表单配置
 */
export const vocabFormConfig: FormConfig = {
  intent: "create_vocab_video",
  titleKey: "vocabTitle",
  descriptionKey: "vocabDescription",
  fields: [
    {
      name: "words",
      type: "textarea",
      labelKey: "wordList",
      required: true,
      placeholderKey: "wordListPlaceholder",
    },
    {
      name: "difficulty",
      type: "select",
      labelKey: "difficulty",
      required: false,
      defaultValue: "easy",
      options: [
        { labelKey: "difficultyEasy", value: "easy" },
        { labelKey: "difficultyMedium", value: "medium" },
        { labelKey: "difficultyHard", value: "hard" },
      ],
    },
    {
      name: "sentence_level",
      type: "select",
      labelKey: "sentenceLevel",
      required: false,
      defaultValue: "simple",
      options: [
        { labelKey: "sentenceSimple", value: "simple" },
        { labelKey: "sentenceComplex", value: "complex" },
      ],
    },
    {
      name: "repetitions",
      type: "number",
      labelKey: "repetitions",
      required: false,
      min: 1,
      max: 5,
      defaultValue: 2,
    },
    {
      name: "style",
      type: "select",
      labelKey: "videoStyle",
      required: false,
      defaultValue: "anime",
      options: [
        { labelKey: "styleAnime", value: "anime" },
        { labelKey: "styleRealism", value: "realism" },
        { labelKey: "styleDisney", value: "disney" },
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
