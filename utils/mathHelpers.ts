
import { ArithmeticProblem, NumberPickerProblem, NumberType, MathPuzzleProblem, RightBoxLevel, DraggableNumber } from '../types';

export const generateArithmeticProblem = (): ArithmeticProblem => {
  const num1 = Math.floor(Math.random() * 5) + 1;
  const num2 = Math.floor(Math.random() * 5) + 1;
  return { num1, num2, answer: num1 + num2 };
};

const isEven = (n: number): boolean => n % 2 === 0;
const isOdd = (n: number): boolean => n % 2 !== 0;
const isPrime = (num: number): boolean => {
  if (num <= 1) return false;
  for (let i = 2; i * i <= num; i++) {
    if (num % i === 0) return false;
  }
  return true;
};
const isFibonacci = (n: number): boolean => {
    if (n < 0) return false;
    const isPerfectSquare = (x: number) => {
        const s = Math.sqrt(x);
        return (s * s === x);
    };
    return isPerfectSquare(5 * n * n + 4) || isPerfectSquare(5 * n * n - 4);
};

const numberCheckers: Record<NumberType, (n: number) => boolean> = {
    even: isEven,
    odd: isOdd,
    prime: isPrime,
    fibonacci: isFibonacci,
};

export const generateNumberPickerProblem = (type: NumberType): NumberPickerProblem => {
    const numbers = new Set<number>();
    let correctAnswer = -1;

    // Find a correct answer
    while (correctAnswer === -1) {
        const potentialAnswer = Math.floor(Math.random() * 20) + 1;
        if (numberCheckers[type](potentialAnswer)) {
            correctAnswer = potentialAnswer;
            numbers.add(correctAnswer);
        }
    }

    // Fill with incorrect answers
    while (numbers.size < 5) {
        const randomNum = Math.floor(Math.random() * 20) + 1;
        if (!numberCheckers[type](randomNum) && !numbers.has(randomNum)) {
            numbers.add(randomNum);
        }
    }
    
    return {
        numbers: Array.from(numbers).sort(() => Math.random() - 0.5),
        type,
        correctAnswer
    };
};

export const generateMathPuzzleProblem = (): MathPuzzleProblem => {
    const operations = ['ADD', 'SUB', 'MUL', 'DIV', 'SQUARE', 'ROOT'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let question = '';
    let correctAnswer = 0;

    switch (op) {
        case 'ADD':
            const a1 = Math.floor(Math.random() * 50) + 1;
            const a2 = Math.floor(Math.random() * 50) + 1;
            question = `${a1} + ${a2}`;
            correctAnswer = a1 + a2;
            break;
        case 'SUB':
            const s1 = Math.floor(Math.random() * 50) + 10;
            const s2 = Math.floor(Math.random() * s1); // ensure positive result
            question = `${s1} - ${s2}`;
            correctAnswer = s1 - s2;
            break;
        case 'MUL':
            const m1 = Math.floor(Math.random() * 12) + 2;
            const m2 = Math.floor(Math.random() * 12) + 2;
            question = `${m1} × ${m2}`;
            correctAnswer = m1 * m2;
            break;
        case 'DIV':
            const d2 = Math.floor(Math.random() * 10) + 2;
            correctAnswer = Math.floor(Math.random() * 10) + 2;
            const d1 = d2 * correctAnswer;
            question = `${d1} ÷ ${d2}`;
            break;
        case 'SQUARE':
            const sq = Math.floor(Math.random() * 12) + 2;
            question = `${sq}²`;
            correctAnswer = sq * sq;
            break;
        case 'ROOT':
            correctAnswer = Math.floor(Math.random() * 12) + 2;
            question = `√${correctAnswer * correctAnswer}`;
            break;
    }

    const options = new Set<number>();
    options.add(correctAnswer);

    while (options.size < 4) {
        const variance = Math.floor(Math.random() * 10) + 1;
        const sign = Math.random() > 0.5 ? 1 : -1;
        const val = correctAnswer + (variance * sign);
        
        // Ensure positive and not equal to correct answer or existing options
        if (val >= 0 && !options.has(val)) {
            options.add(val);
        } else {
             // Fallback if the random generation struggles
             options.add(correctAnswer + options.size + 1);
        }
    }

    return {
        question,
        options: Array.from(options).sort(() => Math.random() - 0.5),
        correctAnswer
    };
};

export const generateRightBoxLevel = (count: number = 6): RightBoxLevel => {
    const types: ('even'|'odd')[] = ['even', 'odd'];
    const targetType = types[Math.floor(Math.random() * types.length)];
    
    const numbers: DraggableNumber[] = [];
    const usedValues = new Set<number>();
    
    // Attempt to generate a mix of correct and incorrect numbers
    while (numbers.length < count) {
        const val = Math.floor(Math.random() * 50) + 1;
        if (!usedValues.has(val)) {
            usedValues.add(val);
            numbers.push({
                id: `num-${Math.random().toString(36).substr(2,9)}`,
                value: val,
                // Spawn on the left 70% of the screen
                x: Math.random() * 0.6 + 0.05, 
                y: Math.random() * 0.6 + 0.2, 
                isDragging: false
            });
        }
    }
    
    return { targetType, numbers };
};

// --- Geometry Helpers for Angle Magic ---

export const getVectorAngle = (p1: {x:number, y:number}, p2: {x:number, y:number}): number => {
    // Returns angle in degrees [0, 360) of vector p1->p2 relative to X axis
    // Inverting Y because screen coordinates (Y increases downwards)
    const dy = -(p2.y - p1.y);
    const dx = p2.x - p1.x;
    let theta = Math.atan2(dy, dx) * (180 / Math.PI);
    if (theta < 0) theta += 360;
    return theta;
};

export const getAngleDifference = (angle1: number, angle2: number): number => {
    // Difference from angle1 to angle2 counter-clockwise
    let diff = angle2 - angle1;
    if (diff < 0) diff += 360;
    return diff;
};

export const classifyAngle = (angle: number): string => {
    // Determine angle type with some tolerance for floating point jitter
    if (angle < 5 || angle > 355) return 'Complete (360°)';
    if (angle < 85) return 'Acute';
    if (angle <= 95) return 'Right';
    if (angle < 175) return 'Obtuse';
    if (angle <= 185) return 'Straight';
    return 'Reflex';
};
