import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Asteroid({
    globeRef,
    impact,
    onLoaded,
    visible,
    onImpactComplete
}) {
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
            console.log('🎨 Creating asteroid cube');

            const geometry = new THREE.BoxGeometry(20, 20, 20);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const cube = new THREE.Mesh(geometry, material);

            sceneRef.current.add(cube);
            asteroidRef.current = cube;

            if (onLoaded) {
                onLoaded({ cube, impact });
            }

            // NO cleanup here - we'll handle it manually in animate
        }
    }, [globeRef]);

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
                    asteroidRef.current = null; // Clear reference
                }
            }, 500);

            startTimeRef.current = null;
        }
    };

    // Start/stop animation
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
    }, [visible, impact.lat, impact.lng]); // ← Also restart when impact changes

    // Show/hide cube
    useEffect(() => {
        if (asteroidRef.current) {
            asteroidRef.current.visible = visible !== false;
        }
    }, [visible]);

    return null;
}