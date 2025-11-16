
import { ArithmeticProblem, NumberPickerProblem, NumberType } from '../types';

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
