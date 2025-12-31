import { create } from 'zustand';
import { produce } from 'immer';
import { ICreation, ICharacter, IScene, IShot, CreationStatus } from '@/types';

export type V2Step = 
  | 'character_analysis'
  | 'scene_breakdown'
  | 'visual_generation'
  | 'video_generation';

export interface V2StepConfig {
  id: V2Step;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
}

export interface CreationV2State {
  // Creation Data
  creation: ICreation | null;
  isLoading: boolean;
  error: string | null;

  // Flow Control
  currentStep: number;
  steps: V2StepConfig[];
  
  // Selection/Editing
  selectedCharacterId: string | null;
  selectedSceneId: number | null;
  selectedShotId: number | null;

  // Actions
  setCreation: (creation: ICreation) => void;
  updateCreation: (updates: Partial<ICreation>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Step Actions
  setStep: (stepIndex: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateStepStatus: (stepId: V2Step, status: V2StepConfig['status'], progress?: number) => void;

  // Data Actions
  updateCharacter: (characterId: string, updates: Partial<ICharacter>) => void;
  updateScene: (sceneId: number, updates: Partial<IScene>) => void;
  updateShot: (shotId: number, updates: Partial<IShot>) => void;
  
  // Selection Actions
  selectCharacter: (id: string | null) => void;
  selectScene: (id: number | null) => void;
  selectShot: (id: number | null) => void;
}

const initialSteps: V2StepConfig[] = [
  { id: 'character_analysis', label: '角色分析', status: 'pending' },
  { id: 'scene_breakdown', label: '分镜拆解', status: 'pending' },
  { id: 'visual_generation', label: '视觉生成', status: 'pending' },
  { id: 'video_generation', label: '视频生成', status: 'pending' },
];

export const useCreationV2Store = create<CreationV2State>((set) => ({
  creation: null,
  isLoading: false,
  error: null,
  
  currentStep: 0,
  steps: initialSteps,
  
  selectedCharacterId: null,
  selectedSceneId: null,
  selectedShotId: null,

  setCreation: (creation) => set({ creation }),
  
  updateCreation: (updates) => set(produce((state: CreationV2State) => {
    if (state.creation) {
      Object.assign(state.creation, updates);
    }
  })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setStep: (stepIndex) => set({ currentStep: stepIndex }),
  
  nextStep: () => set(produce((state: CreationV2State) => {
    if (state.currentStep < state.steps.length - 1) {
      state.currentStep += 1;
    }
  })),
  
  prevStep: () => set(produce((state: CreationV2State) => {
    if (state.currentStep > 0) {
      state.currentStep -= 1;
    }
  })),

  updateStepStatus: (stepId, status, progress) => set(produce((state: CreationV2State) => {
    const step = state.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (progress !== undefined) {
        step.progress = progress;
      }
    }
  })),

  updateCharacter: (characterId, updates) => set(produce((state: CreationV2State) => {
    if (state.creation?.characters) {
      const char = state.creation.characters.find(c => c.uuid === characterId || c.id?.toString() === characterId);
      if (char) {
        Object.assign(char, updates);
      }
    }
  })),

  updateScene: (sceneId, updates) => set(produce((state: CreationV2State) => {
    if (state.creation?.scenes) {
      const scene = state.creation.scenes.find(s => s.scene_id === sceneId);
      if (scene) {
        Object.assign(scene, updates);
      }
    }
  })),

  updateShot: (shotId, updates) => set(produce((state: CreationV2State) => {
    if (state.creation?.scenes) {
      for (const scene of state.creation.scenes) {
        const shot = scene.shots?.find(s => s.shot_id === shotId);
        if (shot) {
          Object.assign(shot, updates);
          break;
        }
      }
    }
  })),

  selectCharacter: (id) => set({ selectedCharacterId: id }),
  selectScene: (id) => set({ selectedSceneId: id }),
  selectShot: (id) => set({ selectedShotId: id }),
}));
