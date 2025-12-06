
export enum GameMode {
  MENU = 'MENU',
  ARITHMETIC = 'ARITHMETIC',
  NUMBER_PICKER = 'NUMBER_PICKER',
  MATH_PUZZLE = 'MATH_PUZZLE',
  RIGHT_BOX = 'RIGHT_BOX',
  ANGLE_MAGIC = 'ANGLE_MAGIC',
}

export interface ArithmeticProblem {
  num1: number;
  num2: number;
  answer: number;
}

export type NumberType = 'even' | 'odd' | 'prime' | 'fibonacci';

export interface NumberPickerProblem {
  numbers: number[];
  type: NumberType;
  correctAnswer: number;
}

export interface MathPuzzleProblem {
  question: string;
  options: number[];
  correctAnswer: number;
}

export interface DraggableNumber {
  id: string;
  value: number;
  x: number;
  y: number;
  isDragging: boolean;
}

export interface RightBoxLevel {
  targetType: 'even' | 'odd';
  numbers: DraggableNumber[];
}

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type LandmarkList = Landmark[];

export type Results = {
  multiHandLandmarks: LandmarkList[];
  multiHandedness: {
    index: number;
    score: number;
    label: 'Left' | 'Right';
  }[];
};

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: (ctx: CanvasRenderingContext2D, landmarks: LandmarkList, connections: any, options: any) => void;
    drawLandmarks: (ctx: CanvasRenderingContext2D, landmarks: LandmarkList, options: any) => void;
    HAND_CONNECTIONS: any;
  }
}
