
import { ArithmeticProblem, NumberPickerProblem, NumberType, MathPuzzleProblem } from '../types';

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
