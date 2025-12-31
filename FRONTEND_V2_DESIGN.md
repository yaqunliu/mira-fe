# Frontend V2 Flow & Architecture Design

## 1. Overview
The V2 Frontend will guide the user through a step-by-step video creation process, mirroring the backend pipeline. It will feature a robust Multi-track Timeline Editor for the final assembly and preview.

## 2. Step-by-Step Workflow (Stepper)

The creation process is divided into the following steps:

### Step 1: Character Analysis
- **Input**: Novel/Script text.
- **Action**: Call Step 1 API.
- **UI**: Display extracted characters. Allow user to edit names, descriptions, and taglines.
- **Next**: Proceed to Scene Breakdown.

### Step 2: Scene & Shot Breakdown
- **Input**: Confirmed characters.
- **Action**: Call Step 2 API.
- **UI**: List Scenes and Shots.
  - **Scene Card**: Title, Environment settings (Time, Location, etc.).
  - **Shot List**: Shot number, description, narration, estimated duration.
- **Edit**: Allow modifying script/narration before image generation.

### Step 3: Visual Assets Generation (Images)
- **Action**: Parallel execution of Step 3 (Char Images) & Step 4 (Scene Images).
- **UI**:
  - **Character Gallery**: Show generated character reference images.
    - *Feature*: **Regenerate Button** (calls `POST /characters/regenerate-image`).
  - **Scene Gallery**: Show generated scene background images.
    - *Feature*: **Regenerate Button** (calls `POST /scenes/{id}/regenerate-image`).

### Step 4: Storyboard (Shot Images)
- **Action**: Call Step 5 (Prompt) & Step 6 (Image).
- **UI**: Grid view of Shots.
  - Display Shot Image, Prompt, Narration.
  - *Feature*: **Regenerate Image** (calls `POST /shots/{id}/regenerate`).
  - *Feature*: **Edit Prompt**: Allow tweaking the prompt before regenerating.

### Step 5: Video & Audio Generation
- **Action**: Call Step 7 (Video Prompt), Step 8 (Video Gen), Step 9 (Audio Gen).
- **UI**: Progress indicators for each shot.
  - Display generated Video clips and Audio waves.
  - *Feature*: **Regenerate Video** (calls `POST /shots/{id}/regenerate-video`).

## 3. Multi-track Timeline Editor

The final step is the **Timeline Editor**, where assets are assembled.

### Components
1.  **Preview Player**:
    - A video player (or Canvas) that renders the current frame based on the Timeline state.
    - Supports Play/Pause/Seek.
    - **Sync**: Updates `currentTime` in `useTimelineStore`.

2.  **Timeline Track Area**:
    - **Video Track**: Displays Shot Videos.
    - **Audio Track**: Displays Narration/Dialogue audio.
    - **Subtitle Track**: Displays generated subtitles.
    - **Background Music Track**: (Optional) Allow uploading BGM.

### Features
- **Drag & Drop**: Reorder clips.
- **Trim**: Adjust start/end times of clips.
- **Multi-layer**: Support overlays (e.g., text over video).
- **Zoom**: Zoom in/out of the timeline.

## 4. API Integration Strategy

### Task Polling
- Use a global `TaskPoller` hook.
- Poll `/api/v1/tasks/{task_id}` every 2-3 seconds.
- Update UI state based on `task_status` (PENDING -> PROCESSING -> SUCCESS/FAILURE).
- Update progress bars using `progress` field.

### Regeneration Flow
1. User clicks "Regenerate".
2. Frontend calls `POST /.../regenerate`.
3. Backend returns `task_id`.
4. Frontend adds `task_id` to `TaskPoller`.
5. UI shows "Generating..." spinner on the specific item.
6. Upon completion, refresh the item image/video URL.

## 5. Data Structure (TimelineProject)
```typescript
interface TimelineProject {
  tracks: Track[];
  duration: number; // Total duration in seconds
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'text';
  clips: Clip[];
}

interface Clip {
  id: string;
  url: string; // URL to resource (Video/Image/Audio)
  startInTimeline: number; // Start time in seconds
  duration: number;
  offset: number; // Start time within the source file
}
```
