import { ICreation } from "@/types/creation";
import { CreationMetadata, DEFAULT_METADATA, StepStatus } from "@/types/metadata";

/**
 * Checks if the creation has valid metadata.
 * If not, returns a new creation object with initialized metadata.
 * Note: This does not save to the backend, only updates the local object.
 */
export function ensureMetadata(creation: ICreation): ICreation {
  if (!creation.extra_data || !creation.extra_data.steps) {
    return {
      ...creation,
      extra_data: {
        ...(creation.extra_data || {}),
        ...DEFAULT_METADATA,
      },
    };
  }
  return creation;
}

/**
 * Gets the status of a specific step from the creation metadata.
 * Includes timeout logic (1 hour).
 */
export function getStepStatus(
  creation: ICreation,
  step: keyof CreationMetadata["steps"]
): StepStatus {
  const metadata = (creation.extra_data as unknown as CreationMetadata) || DEFAULT_METADATA;
  const stepData = metadata.steps?.[step] || DEFAULT_METADATA.steps[step];
  
  // 超时检查：如果处于 pending 或 processing 状态超过 1 小时，标记为超时失败
  const TIMEOUT_MS = 60 * 60 * 1000; // 1 小时
  if (
    (stepData.status === 'processing' || stepData.status === 'pending') && 
    stepData.updatedAt && 
    Date.now() - stepData.updatedAt > TIMEOUT_MS
  ) {
    return {
      ...stepData,
      status: 'failed',
      error: 'timeout'
    };
  }
  
  return stepData;
}

/**
 * Updates the status of a specific step in the creation metadata.
 * Returns a new metadata object (does not mutate the original creation directly, 
 * usually used before calling an update API).
 */
export function createUpdatedMetadata(
  creation: ICreation,
  step: keyof CreationMetadata["steps"],
  updates: Partial<StepStatus>
): CreationMetadata {
  const currentMetadata = (creation.extra_data as unknown as CreationMetadata) || DEFAULT_METADATA;
  
  // Ensure steps object exists
  const steps = currentMetadata.steps || DEFAULT_METADATA.steps;
  
  return {
    ...currentMetadata,
    steps: {
      ...steps,
      [step]: {
        ...(steps[step] || DEFAULT_METADATA.steps[step]),
        ...updates,
        updatedAt: Date.now(),
      },
    },
  };
}

/**
 * Checks if character analysis has been triggered.
 */
export function hasTriggeredCharacterAnalysis(creation: ICreation): boolean {
  const status = getStepStatus(creation, "characterAnalysis");
  return status.triggered;
}
