
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, ArithmeticProblem, NumberPickerProblem, Results, LandmarkList, NumberType } from './types';
import { generateArithmeticProblem, generateNumberPickerProblem } from './utils/mathHelpers';
import { countFingers, isPinching, getIndexFingerTipCoordinates } from './utils/handGestureUtils';

const GameContainer: React.FC<{ children: React.ReactNode, title: string, onBack: () => void }> = ({ children, title, onBack }) => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 p-4 relative">
        <button
            onClick={onBack}
            className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-transform transform hover:scale-105 shadow-lg shadow-blue-500/50">
            &larr; Menu
        </button>
        <h1 className="font-orbitron text-4xl md:text-5xl font-bold mb-4 text-glow">{title}</h1>
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


const GameSelector = ({ onSelectGame }: { onSelectGame: (mode: GameMode) => void }) => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-indigo-900">
            <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-4 text-glow tracking-widest">
                MATHIVERSE
            </h1>
            <p className="text-xl text-indigo-200 mb-12 max-w-2xl text-center">
                An AI-powered math playground. Use your hands to interact with numbers and solve challenges in a whole new way!
            </p>
            <div className="flex flex-col md:flex-row gap-6">
                <button
                    onClick={() => onSelectGame(GameMode.ARITHMETIC)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xl py-4 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-cyan-500/50 font-orbitron">
                    Arithmetic Challenge
                </button>
                <button
                    onClick={() => onSelectGame(GameMode.NUMBER_PICKER)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl py-4 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-purple-500/50 font-orbitron">
                    Number Hunt
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
        case GameMode.MENU:
        default:
            return <GameSelector onSelectGame={selectGame} />;
    }
};

export default App;
