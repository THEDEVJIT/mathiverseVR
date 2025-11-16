
import { LandmarkList } from '../types';

const FINGER_TIPS = [8, 12, 16, 20];
const FINGER_PIPS = [6, 10, 14, 18];
const THUMB_TIP = 4;
const THUMB_IP = 3;

export const countFingers = (landmarks: LandmarkList): number => {
    if (!landmarks || landmarks.length === 0) return 0;

    let fingerCount = 0;
    
    // Simple vertical check, assumes hand is upright
    const wristY = landmarks[0].y;

    // Thumb: Check based on x position relative to palm for horizontal extension
    // This is more robust than a simple y check for the thumb.
    // Check if thumb tip is to the left of the point between thumb_ip and thumb_mcp (for right hand)
    const isRightHand = landmarks[THUMB_TIP].x < landmarks[17].x; // A heuristic for right hand
    if (isRightHand) {
      if (landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x) fingerCount++;
    } else { // Left hand
      if (landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x) fingerCount++;
    }

    // Other 4 fingers
    for (let i = 0; i < 4; i++) {
        if (landmarks[FINGER_TIPS[i]].y < landmarks[FINGER_PIPS[i]].y) {
            fingerCount++;
        }
    }

    return fingerCount;
};

export const isPinching = (landmarks: LandmarkList): boolean => {
    if (!landmarks || landmarks.length === 0) return false;
    const thumbTip = landmarks[THUMB_TIP];
    const indexTip = landmarks[8];
    const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    return distance < 0.05;
};

export const getIndexFingerTipCoordinates = (landmarks: LandmarkList): { x: number, y: number } | null => {
    if (!landmarks || landmarks.length === 0) return null;
    return { x: landmarks[8].x, y: landmarks[8].y };
};
