
import { easeCubic } from "d3-ease";

// Constants for the meteor animation
export const METEOR_PRE_IMPACT_SCALE = 0.05;
export const METEOR_POST_IMPACT_SCALE = 1.25;

// Function to calculate the meteor's position and scale during the animation
export function getMeteorValues(progress, impactLocation) {
    const t = easeCubic(progress);
    const scale = METEOR_PRE_IMPACT_SCALE + t * (METEOR_POST_IMPACT_SCALE - METEOR_PRE_IMPACT_SCALE);

    return {
        position: [
            impactLocation.lng,
            impactLocation.lat,
            (1 - t) * 2000000, // Start high and move towards the surface
        ],
        scale: scale * 100000,
    };
}
