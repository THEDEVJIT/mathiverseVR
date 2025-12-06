
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, ArithmeticProblem, NumberPickerProblem, Results, LandmarkList, NumberType, MathPuzzleProblem, RightBoxLevel, DraggableNumber } from './types';
import { generateArithmeticProblem, generateNumberPickerProblem, generateMathPuzzleProblem, generateRightBoxLevel, getVectorAngle, getAngleDifference, classifyAngle } from './utils/mathHelpers';
import { countFingers, isPinching, getIndexFingerTipCoordinates } from './utils/handGestureUtils';

const GameContainer: React.FC<{ children: React.ReactNode, title: string, onBack: () => void }> = ({ children, title, onBack }) => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 p-4 relative">
        <button
            onClick={onBack}
            className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-transform transform hover:scale-105 shadow-lg shadow-blue-500/50 z-50">
            &larr; Menu
        </button>
        <h1 className="font-orbitron text-4xl md:text-5xl font-bold mb-4 text-glow relative z-10">{title}</h1>
        {children}
    </div>
);

const CameraView: React.FC<{ onResults: (results: Results) => void, children?: React.ReactNode }> = ({ onResults, children }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const onResultsRef = useRef(onResults);
    onResultsRef.current = onResults;

    useEffect(() => {
        const hands = new window.Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2, // Detect two hands
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        const handleResults = (results: Results) => {
            if (canvasRef.current && videoRef.current) {
                const canvasCtx = canvasRef.current.getContext('2d');
                if (canvasCtx) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    
                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    
                    // Flip horizontally to match the mirrored video feed
                    canvasCtx.scale(-1, 1);
                    canvasCtx.translate(-canvasRef.current.width, 0);

                    if (results.multiHandLandmarks && results.multiHandedness) {
                        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                            const landmarks = results.multiHandLandmarks[i];
                            const classification = results.multiHandedness[i];
                            const isRightHand = classification.label === 'Right';
                            const color = isRightHand ? '#06b6d4' : '#d946ef'; // Cyan for Right, Fuchsia for Left
                            
                            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color, lineWidth: 5 });
                            window.drawLandmarks(canvasCtx, landmarks, { color: '#FFFFFF', lineWidth: 2, radius: 5 });
                        }
                    }
                    canvasCtx.restore();
                }
            }
            onResultsRef.current(results);
        };

        hands.onResults(handleResults);
        
        let camera: any = null;
        if (videoRef.current) {
            camera = new window.Camera(videoRef.current, {
                onFrame: async () => {
                    if (videoRef.current) {
                        await hands.send({ image: videoRef.current });
                        if(loading) setLoading(false);
                    }
                },
                width: 640,
                height: 480,
            });
            camera.start();
        }

        return () => {
            camera?.stop();
            hands.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/40">
            {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
                    <p className="text-xl font-orbitron animate-pulse">Initializing Camera...</p>
                </div>
            )}
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform scaleX(-1)" playsInline></video>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10"></canvas>
            <div className="absolute inset-0 z-20">{children}</div>
        </div>
    );
};


const ArithmeticGame = ({ backToMenu }: { backToMenu: () => void }) => {
    const [problem, setProblem] = useState<ArithmeticProblem>(generateArithmeticProblem());
    const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
    const [score, setScore] = useState(0);
    const lastDetectionTime = useRef(0);
    const detectionCooldown = 2000; // 2 seconds

    const newProblem = useCallback(() => {
        setProblem(generateArithmeticProblem());
        setFeedback(null);
    }, []);

    const onResults = useCallback((results: Results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            let totalFingers = 0;
            for (const handLandmarks of results.multiHandLandmarks) {
                totalFingers += countFingers(handLandmarks);
            }
            
            const now = Date.now();
            if (now - lastDetectionTime.current < detectionCooldown || feedback) return;

            if (totalFingers > 0) {
                 if (totalFingers === problem.answer) {
                    setFeedback({ message: 'Correct!', color: 'text-green-400' });
                    setScore(s => s + 10);
                    lastDetectionTime.current = now;
                    setTimeout(newProblem, detectionCooldown);
                } else {
                    setFeedback({ message: `Not quite! That's ${totalFingers}.`, color: 'text-red-400' });
                    lastDetectionTime.current = now;
                    setTimeout(() => setFeedback(null), detectionCooldown - 500);
                }
            }
        }
    }, [problem.answer, newProblem, feedback, detectionCooldown]);

    return (
        <GameContainer title="Arithmetic Challenge" onBack={backToMenu}>
            <div className="w-full max-w-2xl text-center">
                 <div className="my-4 p-4 bg-black bg-opacity-50 rounded-lg">
                    <p className="text-5xl md:text-7xl font-orbitron tracking-widest text-cyan-300 text-glow">
                        {problem.num1} + {problem.num2} = ?
                    </p>
                    <p className="mt-2 text-2xl font-semibold">Score: {score}</p>
                </div>
                 {feedback && (
                    <div className={`text-4xl font-bold font-orbitron animate-pulse ${feedback.color}`}>
                        {feedback.message}
                    </div>
                )}
            </div>
             <CameraView onResults={onResults} />
        </GameContainer>
    );
};

const NumberPickerGame = ({ backToMenu }: { backToMenu: () => void }) => {
    const [problem, setProblem] = useState<NumberPickerProblem>(generateNumberPickerProblem('even'));
    const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
    const [score, setScore] = useState(0);
    const [cursor, setCursor] = useState<{ x: number, y: number } | null>(null);
    const numberPositions = useRef<Array<{el: HTMLDivElement | null}>>([]);
    
    const newProblem = useCallback(() => {
        const types: NumberType[] = ['even', 'odd', 'prime', 'fibonacci'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        setProblem(generateNumberPickerProblem(randomType));
        setFeedback(null);
    }, []);
    
    useEffect(() => {
        numberPositions.current = Array(problem.numbers.length).fill(null).map(() => ({ el: null }));
    }, [problem.numbers.length]);

    const onResults = useCallback((results: Results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !feedback) {
            const handLandmarks = results.multiHandLandmarks[0]; // Use the first detected hand for interaction
            const fingerTip = getIndexFingerTipCoordinates(handLandmarks);
            if (fingerTip) {
                // Flip X coordinate for mirrored camera view
                setCursor({x: 1 - fingerTip.x, y: fingerTip.y });
            }

            if (isPinching(handLandmarks)) {
                let selectedNumber: number | null = null;
                if(cursor) {
                    const cursorEl = document.getElementById('cursor-dot');
                    if (cursorEl) {
                        const cursorRect = cursorEl.getBoundingClientRect();
                        for(let i=0; i<numberPositions.current.length; i++){
                            const numEl = numberPositions.current[i].el;
                            if(numEl){
                                const numRect = numEl.getBoundingClientRect();
                                if (cursorRect.left < numRect.right && cursorRect.right > numRect.left &&
                                    cursorRect.top < numRect.bottom && cursorRect.bottom > numRect.top) {
                                    selectedNumber = problem.numbers[i];
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (selectedNumber !== null) {
                    if (selectedNumber === problem.correctAnswer) {
                        setFeedback({ message: 'Awesome!', color: 'text-green-400' });
                        setScore(s => s + 10);
                        setTimeout(newProblem, 2000);
                    } else {
                        setFeedback({ message: 'Try Again!', color: 'text-red-400' });
                        setTimeout(() => setFeedback(null), 1500);
                    }
                }
            }
        } else {
            setCursor(null);
        }
    }, [feedback, cursor, newProblem, problem.correctAnswer, problem.numbers]);

    return (
        <GameContainer title="Number Hunt" onBack={backToMenu}>
            <div className="w-full max-w-2xl text-center mb-4 p-4 bg-black bg-opacity-50 rounded-lg">
                <p className="text-2xl md:text-3xl font-orbitron text-cyan-300 text-glow">
                    Pinch the <span className="uppercase text-yellow-300">{problem.type}</span> number!
                </p>
                <p className="mt-2 text-xl font-semibold">Score: {score}</p>
            </div>
             <CameraView onResults={onResults}>
                <div className="w-full h-full grid grid-cols-5 gap-4 items-center justify-items-center p-4">
                     {problem.numbers.map((num, i) => (
                        <div key={`${problem.correctAnswer}-${num}-${i}`} 
                            ref={el => numberPositions.current[i] = {el}}
                            className="w-20 h-20 md:w-24 md:h-24 bg-purple-600 bg-opacity-80 rounded-full flex items-center justify-center text-3xl font-bold font-orbitron border-4 border-purple-400 shadow-lg shadow-purple-500/50 transition-transform duration-300 hover:scale-110 cursor-pointer">
                            {num}
                        </div>
                    ))}
                </div>
                 {cursor && <div id="cursor-dot" className="absolute w-6 h-6 bg-cyan-400 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}></div>}
                 {feedback && <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-5xl font-bold font-orbitron animate-pulse" style={{ color: feedback.color.replace('text-', '') }}>{feedback.message}</div>}
            </CameraView>
        </GameContainer>
    );
};

const MathPuzzleGame = ({ backToMenu }: { backToMenu: () => void }) => {
    const [problem, setProblem] = useState<MathPuzzleProblem>(generateMathPuzzleProblem());
    const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
    const [score, setScore] = useState(0);
    const [cursor, setCursor] = useState<{ x: number, y: number } | null>(null);
    const optionRefs = useRef<Array<{el: HTMLDivElement | null}>>([]);

    useEffect(() => {
        optionRefs.current = Array(4).fill(null).map(() => ({ el: null }));
    }, [problem]);

    const newProblem = useCallback(() => {
        setProblem(generateMathPuzzleProblem());
        setFeedback(null);
    }, []);

    const onResults = useCallback((results: Results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !feedback) {
            const handLandmarks = results.multiHandLandmarks[0];
            const fingerTip = getIndexFingerTipCoordinates(handLandmarks);
            if (fingerTip) {
                setCursor({x: 1 - fingerTip.x, y: fingerTip.y });
            }

            if (isPinching(handLandmarks)) {
                let selectedNumber: number | null = null;
                if(cursor) {
                    const cursorEl = document.getElementById('cursor-dot');
                    if (cursorEl) {
                        const cursorRect = cursorEl.getBoundingClientRect();
                        for(let i=0; i<optionRefs.current.length; i++){
                            const optEl = optionRefs.current[i].el;
                            if(optEl){
                                const optRect = optEl.getBoundingClientRect();
                                if (cursorRect.left < optRect.right && cursorRect.right > optRect.left &&
                                    cursorRect.top < optRect.bottom && cursorRect.bottom > optRect.top) {
                                    selectedNumber = problem.options[i];
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (selectedNumber !== null) {
                    if (selectedNumber === problem.correctAnswer) {
                        setFeedback({ message: 'Correct!', color: 'text-green-400' });
                        setScore(s => s + 20);
                        setTimeout(newProblem, 1500);
                    } else {
                        setFeedback({ message: 'Wrong!', color: 'text-red-400' });
                        setTimeout(() => setFeedback(null), 1000);
                    }
                }
            }
        } else {
            setCursor(null);
        }
    }, [feedback, cursor, newProblem, problem]);

    return (
        <GameContainer title="Math Puzzle" onBack={backToMenu}>
            <div className="w-full max-w-2xl text-center mb-4 p-4 bg-black bg-opacity-50 rounded-lg">
                <p className="text-3xl md:text-5xl font-orbitron text-yellow-300 text-glow tracking-wider">
                    {problem.question} = ?
                </p>
                <p className="mt-2 text-xl font-semibold">Score: {score}</p>
            </div>
             <CameraView onResults={onResults}>
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-8 p-12 items-center justify-items-center">
                     {problem.options.map((opt, i) => (
                        <div key={`${problem.correctAnswer}-${opt}-${i}`} 
                            ref={el => optionRefs.current[i] = {el}}
                            className="w-32 h-32 md:w-40 md:h-40 bg-indigo-600 bg-opacity-80 rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-bold font-orbitron border-4 border-indigo-400 shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:bg-indigo-500 cursor-pointer">
                            {opt}
                        </div>
                    ))}
                </div>
                 {cursor && <div id="cursor-dot" className="absolute w-8 h-8 bg-yellow-400 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg shadow-yellow-500/50 transition-all duration-75" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}></div>}
                 {feedback && <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-6xl font-bold font-orbitron animate-bounce" style={{ color: feedback.color.replace('text-', '') }}>{feedback.message}</div>}
            </CameraView>
        </GameContainer>
    );
};


const RightBoxGame = ({ backToMenu }: { backToMenu: () => void }) => {
    const [level, setLevel] = useState<RightBoxLevel>(generateRightBoxLevel());
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<{ message: string; color: string } | null>(null);
    const [cursor, setCursor] = useState<{ x: number, y: number } | null>(null);
    
    // Using Ref for high-frequency game state to avoid re-binding callbacks
    const gameStateRef = useRef({
        numbers: level.numbers,
        targetType: level.targetType,
        isPinching: false,
        draggedId: null as string | null
    });

    // Keep ref in sync with state for rendering updates
    useEffect(() => {
        gameStateRef.current.numbers = level.numbers;
        gameStateRef.current.targetType = level.targetType;
        // If the level refreshed completely, reset drag
        const exists = level.numbers.find(n => n.id === gameStateRef.current.draggedId);
        if(!exists) gameStateRef.current.draggedId = null;
    }, [level]);

    const handleDrop = (num: DraggableNumber) => {
        const isCorrectType = gameStateRef.current.targetType === 'even' 
            ? num.value % 2 === 0 
            : num.value % 2 !== 0;

        if (isCorrectType) {
            setFeedback({ message: 'Correct!', color: 'text-green-400' });
            setScore(s => s + 10);
            
            // Remove the number
            const newNumbers = gameStateRef.current.numbers.filter(n => n.id !== num.id);
            gameStateRef.current.numbers = newNumbers;
            setLevel(prev => ({ ...prev, numbers: newNumbers }));
            
            if (newNumbers.length === 0) {
                setTimeout(() => {
                    const newLevel = generateRightBoxLevel();
                    setLevel(newLevel);
                    setFeedback(null);
                }, 1000);
            } else {
                 setTimeout(() => setFeedback(null), 800);
            }
        } else {
            setFeedback({ message: 'Wrong Box!', color: 'text-red-400' });
            setScore(s => Math.max(0, s - 5));
            
            // Reset position randomly on the left
            const newNumbers = gameStateRef.current.numbers.map(n => {
                if(n.id === num.id) {
                    return { 
                        ...n, 
                        x: Math.random() * 0.6 + 0.05, 
                        y: Math.random() * 0.6 + 0.2, 
                        isDragging: false 
                    };
                }
                return n;
            });
            gameStateRef.current.numbers = newNumbers;
            setLevel(prev => ({ ...prev, numbers: newNumbers }));
            setTimeout(() => setFeedback(null), 800);
        }
    };

    const onResults = useCallback((results: Results) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            setCursor(null);
            gameStateRef.current.isPinching = false;
            if (gameStateRef.current.draggedId) {
                // Drop if lost hand tracking
                const draggedNum = gameStateRef.current.numbers.find(n => n.id === gameStateRef.current.draggedId);
                if (draggedNum) {
                     const newNumbers = gameStateRef.current.numbers.map(n => 
                        n.id === gameStateRef.current.draggedId ? { ...n, isDragging: false } : n
                    );
                    gameStateRef.current.numbers = newNumbers;
                    gameStateRef.current.draggedId = null;
                    setLevel(prev => ({ ...prev, numbers: newNumbers }));
                }
            }
            return;
        }

        const handLandmarks = results.multiHandLandmarks[0];
        const fingerTip = getIndexFingerTipCoordinates(handLandmarks);
        
        if (!fingerTip) return;

        // Current cursor pos (mirrored logic for consistency)
        const cx = 1 - fingerTip.x;
        const cy = fingerTip.y;
        setCursor({ x: cx, y: cy });

        const pinching = isPinching(handLandmarks);
        const state = gameStateRef.current;

        if (pinching) {
            if (!state.isPinching) {
                // Just started pinching, check collision
                // Assume radius of interaction roughly 5%
                const hit = state.numbers.find(n => {
                    const dx = n.x - cx;
                    const dy = n.y - cy;
                    // Simple distance check (adjust threshold as needed)
                    return (dx * dx + dy * dy) < 0.005; 
                });

                if (hit) {
                    state.draggedId = hit.id;
                    const newNumbers = state.numbers.map(n => 
                        n.id === hit.id ? { ...n, isDragging: true } : n
                    );
                    state.numbers = newNumbers;
                    setLevel(prev => ({ ...prev, numbers: newNumbers }));
                }
            } else if (state.draggedId) {
                // Continue dragging
                const newNumbers = state.numbers.map(n => 
                    n.id === state.draggedId ? { ...n, x: cx, y: cy } : n
                );
                state.numbers = newNumbers;
                // Force update for visual
                setLevel(prev => ({ ...prev, numbers: newNumbers }));
            }
        } else {
            // Not pinching
            if (state.isPinching && state.draggedId) {
                // Released
                const droppedNum = state.numbers.find(n => n.id === state.draggedId);
                if (droppedNum) {
                    // Check if inside Right Box (Right 25% -> x > 0.75)
                    if (droppedNum.x > 0.75) {
                        handleDrop(droppedNum);
                    } else {
                        // Released in space
                        const newNumbers = state.numbers.map(n => 
                            n.id === state.draggedId ? { ...n, isDragging: false } : n
                        );
                        state.numbers = newNumbers;
                        setLevel(prev => ({ ...prev, numbers: newNumbers }));
                    }
                }
                state.draggedId = null;
            }
        }
        state.isPinching = pinching;
    }, []);

    return (
        <GameContainer title="Right Box Sort" onBack={backToMenu}>
            <div className="w-full max-w-2xl text-center mb-2 p-2 bg-black bg-opacity-50 rounded-lg">
                <p className="text-2xl md:text-3xl font-orbitron text-white text-glow">
                    Drag <span className="uppercase font-bold text-yellow-400">{level.targetType}</span> numbers to the Right Box!
                </p>
                <p className="mt-1 text-xl font-semibold">Score: {score}</p>
            </div>
             <CameraView onResults={onResults}>
                {/* The Game Zone */}
                <div className="w-full h-full relative">
                    {/* Right Box Zone Indicator */}
                    <div className="absolute right-0 top-0 w-1/4 h-full border-l-4 border-dashed border-green-400 bg-green-900 bg-opacity-30 flex items-center justify-center">
                        <span className="text-green-300 font-orbitron text-2xl font-bold -rotate-90">DROP HERE</span>
                    </div>

                    {/* Draggable Numbers */}
                    {level.numbers.map((num) => (
                        <div key={num.id}
                            className={`absolute w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold font-orbitron border-4 shadow-lg transition-transform
                                ${num.isDragging ? 'scale-125 z-50 border-white bg-blue-500' : 'scale-100 border-cyan-400 bg-cyan-700 bg-opacity-80'}`}
                            style={{ 
                                left: `${num.x * 100}%`, 
                                top: `${num.y * 100}%`,
                                transform: 'translate(-50%, -50%)', // Center anchor
                                pointerEvents: 'none' // Let logic handle interaction
                            }}>
                            {num.value}
                        </div>
                    ))}
                </div>

                 {cursor && <div className={`absolute w-6 h-6 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 z-50
                    ${gameStateRef.current.isPinching ? 'bg-yellow-400 scale-75' : 'bg-transparent'}`} 
                    style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}></div>}
                 
                 {feedback && <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-5xl font-bold font-orbitron animate-pulse z-50" style={{ color: feedback.color.replace('text-', '') }}>{feedback.message}</div>}
            </CameraView>
        </GameContainer>
    );
};


const AngleMagicGame = ({ backToMenu }: { backToMenu: () => void }) => {
    const [angleData, setAngleData] = useState<{ degrees: number, type: string } | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    const onResults = useCallback((results: Results) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // --- Unified Angle Logic ---
        // We define a Vertex and Two Rays.
        // Two Hands Mode: Vertex = Midpoint(LeftWrist, RightWrist). Ray1 = Right Index. Ray2 = Left Index.
        // One Hand Mode: Vertex = Wrist. Ray1 = Thumb. Ray2 = Index.
        
        let vertex = { x: 0, y: 0 };
        let ray1 = { x: 0, y: 0 }; // Base Arm
        let ray2 = { x: 0, y: 0 }; // Target Arm
        let isValid = false;

        const w = canvas.width;
        const h = canvas.height;

        // Identify hands
        const leftHandIdx = results.multiHandedness?.findIndex(h => h.label === 'Left');
        const rightHandIdx = results.multiHandedness?.findIndex(h => h.label === 'Right');

        if (leftHandIdx !== undefined && leftHandIdx !== -1 && rightHandIdx !== undefined && rightHandIdx !== -1) {
            // --- TWO HANDS MODE ---
            // Allows full 360 degrees (Acute, Right, Obtuse, Straight, Reflex)
            const lh = results.multiHandLandmarks[leftHandIdx];
            const rh = results.multiHandLandmarks[rightHandIdx];
            
            // Note: Camera is mirrored (scaleX -1). 
            // Raw x=0 is Camera Left (Screen Right after flip).
            // However, our manual coordinate mapping in previous games used (1-x).
            // Let's stick to (1-x) to map to screen coordinates properly.
            
            // Vertex is midpoint of wrists
            vertex = {
                x: ((1 - lh[0].x) + (1 - rh[0].x)) / 2 * w,
                y: (lh[0].y + rh[0].y) / 2 * h
            };

            // Ray 1: From Vertex to Right Hand Index (which appears on Screen Right side)
            // This acts as our "0 degree" base roughly.
            ray1 = {
                x: (1 - rh[8].x) * w,
                y: rh[8].y * h
            };

            // Ray 2: From Vertex to Left Hand Index (Screen Left side)
            ray2 = {
                x: (1 - lh[8].x) * w,
                y: lh[8].y * h
            };
            isValid = true;
        } else if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // --- ONE HAND MODE ---
            // Limited mostly to Acute/Right (physical limitations)
            const hand = results.multiHandLandmarks[0];
            vertex = {
                x: (1 - hand[0].x) * w,
                y: hand[0].y * h
            };
            // Ray 1: Thumb
            ray1 = {
                x: (1 - hand[4].x) * w,
                y: hand[4].y * h
            };
            // Ray 2: Index
            ray2 = {
                x: (1 - hand[8].x) * w,
                y: hand[8].y * h
            };
            isValid = true;
        }

        if (isValid) {
            // Calculate Vectors relative to Vertex
            const angle1 = getVectorAngle(vertex, ray1); // Base
            const angle2 = getVectorAngle(vertex, ray2); // Target

            // Calculate Difference (Counter-Clockwise from Ray1 to Ray2)
            const diff = getAngleDifference(angle1, angle2);
            
            const type = classifyAngle(diff);
            setAngleData({ degrees: Math.round(diff), type });

            // --- Visualization ---
            
            // Draw Angle Sector (Filled Arc)
            ctx.beginPath();
            ctx.moveTo(vertex.x, vertex.y);
            // Arc logic: ctx.arc(x, y, radius, startAngle, endAngle, counterClockwise)
            // Canvas angles: 0 is Right. Positive is Clockwise (because Y is down).
            // Our getVectorAngle returns degrees 0-360 CCW from X-axis (mathematical).
            // We need to convert back to Canvas radians.
            // Math angle (theta) -> Canvas angle: -theta (since Y is flipped).
            // Wait, getVectorAngle inverted Y.
            // Let's re-calculate raw atan2 for canvas drawing
            const rawAngle1 = Math.atan2(ray1.y - vertex.y, ray1.x - vertex.x);
            const rawAngle2 = Math.atan2(ray2.y - vertex.y, ray2.x - vertex.x);
            
            // Draw the sector. We want the shortest path usually, or the CCW path?
            // The logic above computed diff CCW from ray1 to ray2.
            // So we draw arc from rawAngle1 to rawAngle2.
            // Since canvas Y is down, positive angle is Clockwise visually.
            // If we computed CCW diff in math, we should likely draw CCW in canvas?
            // Actually, let's just draw from Angle1 to Angle2 using the `diff` to decide direction?
            // Easier: just draw arc.
            ctx.arc(vertex.x, vertex.y, 60, rawAngle1, rawAngle2, false); // Draw full way?
            // The `false` means Clockwise? No, `anticlockwise` argument. false = Clockwise.
            // We want CCW (Mathematical positive). So `true`? 
            // But screen Y is flipped.
            // Let's just try drawing a line for now, or just fill.
            
            // To properly fill the specific angle we measured:
            // We measured CCW from Ray1 to Ray2.
            // If diff is 270 (Reflex), we want the big arc.
            // If diff is 90, we want small arc.
            
            // Using `anticlockwise = true` draws CCW on unit circle (if Y up).
            // With Y down, `true` (CCW) means visual Clockwise? No.
            // Let's rely on the visual: Ray1 is Base. Ray2 is Target.
            // We want to highlight the area swept from Ray1 to Ray2.
            
            // To ensure we draw the 'interior' or 'exterior' correctly based on our math:
            // We can draw a lot of small lines or just use the arc with correct flag.
            // Let's assume standard small angle for now unless reflex.
            
            // Actually, simplest way for visualization that matches `diff`:
            // We calculated `diff`.
            // If we just draw arc(vertex, r, angle1, angle2), canvas picks one way.
            // Let's just draw the lines and the text, the sector might be tricky to get perfect without complex logic.
            // But let's try a simple fill.
            
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = type === 'Reflex' ? '#a855f7' : '#facc15'; // Purple for Reflex, Yellow others
            // Canvas arc draws from start to end.
            // We want to draw the shape corresponding to `diff`.
            // If diff is small, straightforward. If diff > 180, we need the "long" way.
            // A helper to draw the correct sector:
            
            // We know we went `diff` degrees CCW (mathematically) from Ray1 to Ray2.
            // In screen coords (Y down), +Angle is CW. -Angle is CCW.
            // Math Angle A -> Screen Angle -A.
            // So we go -diff degrees (Screen CCW which is Visual CW?? This is confusing).
            
            // Let's just draw lines. It's safer.
            ctx.lineTo(ray2.x, ray2.y);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Draw Rays
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            
            // Ray 1 (Base - Cyan)
            ctx.beginPath();
            ctx.moveTo(vertex.x, vertex.y);
            ctx.lineTo(ray1.x, ray1.y);
            ctx.strokeStyle = '#06b6d4';
            ctx.stroke();

            // Ray 2 (Target - Pink)
            ctx.beginPath();
            ctx.moveTo(vertex.x, vertex.y);
            ctx.lineTo(ray2.x, ray2.y);
            ctx.strokeStyle = '#d946ef';
            ctx.stroke();

            // Vertex Point
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();

        } else {
            setAngleData(null);
        }

    }, []);

    return (
        <GameContainer title="Angle Magic" onBack={backToMenu}>
            <div className="w-full max-w-2xl text-center mb-4 p-4 bg-black bg-opacity-50 rounded-lg relative z-20">
                <p className="text-xl md:text-2xl text-indigo-200 mb-2">
                    Open your arms! <span className="text-cyan-400 font-bold">Right Hand</span> is Base, <span className="text-purple-400 font-bold">Left Hand</span> moves.
                </p>
                {angleData ? (
                    <div>
                        <p className="text-6xl md:text-8xl font-orbitron font-bold text-white text-glow mb-2">
                            {angleData.degrees}°
                        </p>
                        <p className={`text-3xl md:text-5xl font-orbitron font-bold animate-pulse
                            ${angleData.type === 'Acute' ? 'text-blue-400' : 
                              angleData.type === 'Right' ? 'text-green-400' :
                              angleData.type === 'Obtuse' ? 'text-orange-400' :
                              angleData.type === 'Straight' ? 'text-red-400' :
                              angleData.type === 'Reflex' ? 'text-purple-400' : 'text-white'}`}>
                            {angleData.type}
                        </p>
                    </div>
                ) : (
                     <p className="text-3xl font-orbitron text-gray-500 animate-pulse">Show me your hands!</p>
                )}
            </div>
             <CameraView onResults={onResults}>
                 <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </CameraView>
        </GameContainer>
    );
};


const GameSelector = ({ onSelectGame }: { onSelectGame: (mode: GameMode) => void }) => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-indigo-900">
            <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-4 text-glow tracking-widest text-center">
                MATHIVERSE
            </h1>
            <p className="text-xl text-indigo-200 mb-12 max-w-2xl text-center">
                An AI-powered math playground. Use your hands to interact with numbers and solve challenges in a whole new way!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
                <button
                    onClick={() => onSelectGame(GameMode.ARITHMETIC)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xl py-6 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-cyan-500/50 font-orbitron">
                    Arithmetic Challenge
                </button>
                <button
                    onClick={() => onSelectGame(GameMode.NUMBER_PICKER)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl py-6 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-purple-500/50 font-orbitron">
                    Number Hunt
                </button>
                <button
                    onClick={() => onSelectGame(GameMode.MATH_PUZZLE)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xl py-6 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-yellow-500/50 font-orbitron">
                    Math Puzzle
                </button>
                <button
                    onClick={() => onSelectGame(GameMode.RIGHT_BOX)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold text-xl py-6 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-green-500/50 font-orbitron">
                    Right Box Sort
                </button>
                 <button
                    onClick={() => onSelectGame(GameMode.ANGLE_MAGIC)}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-bold text-xl py-6 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-pink-500/50 font-orbitron col-span-1 md:col-span-2 lg:col-span-1">
                    Angle Magic
                </button>
            </div>
        </div>
    );
};

const App = () => {
    const [gameMode, setGameMode] = useState<GameMode>(GameMode.MENU);

    const selectGame = (mode: GameMode) => {
        setGameMode(mode);
    };

    const backToMenu = () => {
        setGameMode(GameMode.MENU);
    };

    switch (gameMode) {
        case GameMode.ARITHMETIC:
            return <ArithmeticGame backToMenu={backToMenu} />;
        case GameMode.NUMBER_PICKER:
            return <NumberPickerGame backToMenu={backToMenu} />;
        case GameMode.MATH_PUZZLE:
            return <MathPuzzleGame backToMenu={backToMenu} />;
        case GameMode.RIGHT_BOX:
            return <RightBoxGame backToMenu={backToMenu} />;
        case GameMode.ANGLE_MAGIC:
            return <AngleMagicGame backToMenu={backToMenu} />;
        case GameMode.MENU:
        default:
            return <GameSelector onSelectGame={selectGame} />;
    }
};

export default App;
