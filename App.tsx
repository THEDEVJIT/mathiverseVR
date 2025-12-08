
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
        <div className="relative w-full max-w-5xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/40">
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
                            className="w-20 h-20 md:w-32 md:h-32 bg-purple-600 bg-opacity-80 rounded-full flex items-center justify-center text-3xl font-bold font-orbitron border-4 border-purple-400 shadow-lg shadow-purple-500/50 transition-transform duration-300 hover:scale-110 cursor-pointer">
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
                            className="w-32 h-32 md:w-48 md:h-48 bg-indigo-600 bg-opacity-80 rounded-2xl flex items-center justify-center text-4xl md:text-6xl font-bold font-orbitron border-4 border-indigo-400 shadow-lg shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:bg-indigo-500 cursor-pointer">
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
        
        const w = canvas.width;
        const h = canvas.height;

        // Use robust "Finger Direction" logic.
        // We find the angle of the vector formed by Wrist -> IndexFingerTip for each hand.
        
        let isValid = false;
        let theta1 = 0; // Screen Right Hand (User Left) Angle
        let theta2 = 0; // Screen Left Hand (User Right) Angle
        let vertex = { x: w / 2, y: h / 2 }; // Default center if intersection fails

        if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
            const h1 = results.multiHandLandmarks[0];
            const h2 = results.multiHandLandmarks[1];

            // Sort by X coordinate: Screen Left (User Right) vs Screen Right (User Left)
            const screenLeftHand = h1[0].x < h2[0].x ? h1 : h2;  // Usually User Right Hand
            const screenRightHand = h1[0].x < h2[0].x ? h2 : h1; // Usually User Left Hand

            // Get Key Points (Screen Coords)
            const wristL = { x: (1 - screenLeftHand[0].x) * w, y: screenLeftHand[0].y * h };
            const tipL = { x: (1 - screenLeftHand[8].x) * w, y: screenLeftHand[8].y * h };
            
            const wristR = { x: (1 - screenRightHand[0].x) * w, y: screenRightHand[0].y * h };
            const tipR = { x: (1 - screenRightHand[8].x) * w, y: screenRightHand[8].y * h };

            // Calculate angles of the FINGERS themselves (Cartesian: Y up is positive)
            // Screen Y is down, so dy = -(y2 - y1)
            const angleL = Math.atan2(-(tipL.y - wristL.y), tipL.x - wristL.x) * (180 / Math.PI);
            const angleR = Math.atan2(-(tipR.y - wristR.y), tipR.x - wristR.x) * (180 / Math.PI);

            theta2 = (angleL + 360) % 360;
            theta1 = (angleR + 360) % 360;

            // Calculate Intersection of the two lines for the visual vertex
            // Line 1: (wristR -> tipR), Line 2: (wristL -> tipL)
            // L1: A1x + B1y = C1
            const A1 = tipR.y - wristR.y;
            const B1 = wristR.x - tipR.x;
            const C1 = A1 * wristR.x + B1 * wristR.y;
            
            const A2 = tipL.y - wristL.y;
            const B2 = wristL.x - tipL.x;
            const C2 = A2 * wristL.x + B2 * wristL.y;

            const det = A1 * B2 - A2 * B1;
            
            if (Math.abs(det) > 1) { // Not parallel
                const ix = (B2 * C1 - B1 * C2) / det;
                const iy = (A1 * C2 - A2 * C1) / det;
                // Only use intersection if it's somewhat on screen (expanded bounds)
                if (ix > -w && ix < 2*w && iy > -h && iy < 2*h) {
                    vertex = { x: ix, y: iy };
                } else {
                     // Fallback to midpoint of wrists if intersection is way off
                    vertex = { x: (wristL.x + wristR.x)/2, y: (wristL.y + wristR.y)/2 };
                }
            } else {
                 vertex = { x: (wristL.x + wristR.x)/2, y: (wristL.y + wristR.y)/2 };
            }

            isValid = true;

        } else if (results.multiHandLandmarks && results.multiHandLandmarks.length === 1) {
            // One hand mode: Thumb vs Index
            const hand = results.multiHandLandmarks[0];
            vertex = { x: (1 - hand[0].x) * w, y: hand[0].y * h }; // Wrist as vertex
            
            // Thumb Vector
            const tipThumb = { x: (1 - hand[4].x) * w, y: hand[4].y * h };
            const mcpThumb = { x: (1 - hand[2].x) * w, y: hand[2].y * h }; // Use MCP for stability
            
            // Index Vector
            const tipIndex = { x: (1 - hand[8].x) * w, y: hand[8].y * h };
            const mcpIndex = { x: (1 - hand[5].x) * w, y: hand[5].y * h };

            const angleThumb = Math.atan2(-(tipThumb.y - vertex.y), tipThumb.x - vertex.x) * (180 / Math.PI);
            const angleIndex = Math.atan2(-(tipIndex.y - vertex.y), tipIndex.x - vertex.x) * (180 / Math.PI);

            theta1 = (angleThumb + 360) % 360;
            theta2 = (angleIndex + 360) % 360;
            isValid = true;
        }

        if (isValid) {
            // Calculate CCW sweep from Theta1 (Base) to Theta2 (Target)
            let diff = theta2 - theta1;
            if (diff < 0) diff += 360;

            const type = classifyAngle(diff);
            setAngleData({ degrees: Math.round(diff), type });

            // --- Visualization ---
            const radius = 80;
            
            // Draw Rays from Vertex based on Calculated Angles
            // Note: Canvas Y is down. Math angle 0 is +X. Math angle 90 is +Y (Up).
            // Canvas Angle 0 is +X. Canvas Angle -PI/2 is Up. 
            // So to draw Math Angle `alpha` on Canvas, we need `-alpha`.
            
            const startRad = -theta1 * (Math.PI / 180); 
            const endRad = -theta2 * (Math.PI / 180);

            ctx.beginPath();
            ctx.moveTo(vertex.x, vertex.y);
            
            // Draw Sector: Arc from startRad to endRad.
            // Since we calculated diff as theta2 - theta1 (CCW in Cartesian),
            // In Canvas (Y-flipped), CCW Cartesian is CW Canvas.
            // We want to visually fill the area.
            ctx.arc(vertex.x, vertex.y, radius, startRad, endRad, true); 

            ctx.lineTo(vertex.x, vertex.y);
            ctx.closePath();
            
            ctx.globalAlpha = 0.4;
            const isReflex = diff > 180;
            ctx.fillStyle = isReflex ? '#a855f7' : '#facc15';
            ctx.fill();

            // Outline
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 4;
            ctx.strokeStyle = isReflex ? '#a855f7' : '#facc15';
            ctx.stroke();

            // Draw Vector Lines (Visual Aids for Finger Direction)
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            
            // Ray 1 (Base - Cyan)
            ctx.beginPath();
            ctx.moveTo(vertex.x, vertex.y);
            // Project out
            ctx.lineTo(vertex.x + Math.cos(startRad) * 150, vertex.y + Math.sin(startRad) * 150);
            ctx.strokeStyle = '#06b6d4';
            ctx.stroke();

            // Ray 2 (Target - Pink)
            ctx.beginPath();
            ctx.moveTo(vertex.x, vertex.y);
             // Project out
            ctx.lineTo(vertex.x + Math.cos(endRad) * 150, vertex.y + Math.sin(endRad) * 150);
            ctx.strokeStyle = '#d946ef';
            ctx.stroke();

            // Vertex Dot
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
                    Point your fingers to make the angle!
                </p>
                {angleData ? (
                    <div>
                        <p className="text-6xl md:text-8xl font-orbitron font-bold text-white text-glow mb-2">
                            {angleData.degrees}°
                        </p>
                        <p className={`text-3xl md:text-5xl font-orbitron font-bold animate-pulse
                            ${angleData.type === 'ସୂକ୍ଷ୍ମ କୋଣ' ? 'text-blue-400' : 
                              angleData.type === 'ସମକୋଣ' ? 'text-green-400' :
                              angleData.type === 'ସ୍ଥୂଳ କୋଣ' ? 'text-orange-400' :
                              angleData.type === 'ସରଳ କୋଣ' ? 'text-red-400' :
                              angleData.type === 'ପ୍ରବୃଦ୍ଧ କୋଣ' ? 'text-purple-400' : 'text-white'}`}>
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
