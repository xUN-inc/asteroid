import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAtomValue, useSetAtom } from 'jotai';
import { impactAtom, asteroidAnimationAtom } from '../../utils/atom';

export default function Asteroid({
    globeRef,
    onImpactComplete,
    onLoaded
}) {
    const impact = useAtomValue(impactAtom);
    const { visible } = useAtomValue(asteroidAnimationAtom);
    const setAnimationState = useSetAtom(asteroidAnimationAtom);

    const asteroidRef = useRef(null);
    const animationRef = useRef(null);
    const startTimeRef = useRef(null);
    const sceneRef = useRef(null);

    const START_ALTITUDE = 2;
    const IMPACT_ALTITUDE = 0.01;
    const DURATION_MS = 3000;

    // Create cube and get scene reference
    useEffect(() => {
        if (!globeRef.current) return;

        // Get scene reference once
        if (!sceneRef.current) {
            sceneRef.current = globeRef.current.scene();
        }

        // Create cube if it doesn't exist OR was removed
        if (!asteroidRef.current) {
            console.log('🎨 Creating asteroid cube at', impact);

            const geometry = new THREE.BoxGeometry(20, 20, 20);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const cube = new THREE.Mesh(geometry, material);

            sceneRef.current.add(cube);
            asteroidRef.current = cube;

            if (onLoaded) {
                onLoaded({ cube, impact });
            }
        }
    }, [globeRef, impact.lat, impact.lng]);

    // Position cube at new impact location (NOT just on mount)
    useEffect(() => {
        if (!asteroidRef.current || !globeRef.current) return;

        console.log('📍 Updating asteroid position to:', impact);

        // Position at start location
        const coords = globeRef.current.getCoords(
            impact.lat,
            impact.lng,
            START_ALTITUDE
        );
        asteroidRef.current.position.set(coords.x, coords.y, coords.z);
    }, [impact.lat, impact.lng]); // ← This runs when impact changes!

    // Animation function
    const animate = (currentTime) => {
        if (!startTimeRef.current) {
            startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / DURATION_MS, 1);

        // Calculate current altitude
        const altitude = START_ALTITUDE - (START_ALTITUDE - IMPACT_ALTITUDE) * progress;

        // Update cube position
        if (asteroidRef.current && globeRef.current) {
            const coords = globeRef.current.getCoords(impact.lat, impact.lng, altitude);
            asteroidRef.current.position.set(coords.x, coords.y, coords.z);

            // Add rotation for visual effect
            asteroidRef.current.rotation.x = progress * Math.PI * 4; // 4 full rotations
            asteroidRef.current.rotation.y = progress * Math.PI * 3; // 3 full rotations
        }

        if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            console.log('💥 Impact reached!');
            if (onImpactComplete) onImpactComplete();

            // NEW: Remove asteroid after impact
            setTimeout(() => {
                if (asteroidRef.current && sceneRef.current) {
                    sceneRef.current.remove(asteroidRef.current);
                    console.log('🗑️ Asteroid removed from scene');
                    asteroidRef.current = null;

                    // Reset animation state
                    setAnimationState({ visible: false, isAnimating: false });
                }
            }, 500);

            startTimeRef.current = null;
        }
    };

    useEffect(() => {
        if (visible && asteroidRef.current) {
            console.log('🚀 Starting animation');
            startTimeRef.current = null;
            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [visible]);

    // Show/hide cube
    useEffect(() => {
        if (asteroidRef.current) {
            asteroidRef.current.visible = visible !== false;
        }
    }, [visible]);

    return null;
}