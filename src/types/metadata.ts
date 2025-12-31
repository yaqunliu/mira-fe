export interface StepStatus {
  triggered: boolean;
  taskId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'idle';
  updatedAt?: number;
  error?: string;
}

export interface CreationMetadata {
  steps: {
    characterAnalysis: StepStatus;
    storyboardGeneration: StepStatus;
    sceneGeneration: StepStatus;
    videoGeneration: StepStatus;
  };
}

export const DEFAULT_STEP_STATUS: StepStatus = {
  triggered: false,
  status: 'idle',
};

export const DEFAULT_METADATA: CreationMetadata = {
  steps: {
    characterAnalysis: { ...DEFAULT_STEP_STATUS },
    storyboardGeneration: { ...DEFAULT_STEP_STATUS },
    sceneGeneration: { ...DEFAULT_STEP_STATUS },
    videoGeneration: { ...DEFAULT_STEP_STATUS },
  },
};
