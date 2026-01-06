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
    characterImageGeneration: StepStatus;
    sceneAnalysis: StepStatus;
    sceneImageGeneration: StepStatus;
    shotAnalysis: StepStatus;
    shotImageGeneration: StepStatus;
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
    characterImageGeneration: { ...DEFAULT_STEP_STATUS },
    sceneAnalysis: { ...DEFAULT_STEP_STATUS },
    sceneImageGeneration: { ...DEFAULT_STEP_STATUS },
    shotAnalysis: { ...DEFAULT_STEP_STATUS },
    shotImageGeneration: { ...DEFAULT_STEP_STATUS },
    videoGeneration: { ...DEFAULT_STEP_STATUS },
  },
};
