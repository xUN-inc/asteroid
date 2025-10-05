import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useAtomValue, useSetAtom } from 'jotai';
import { impactAtom, asteroidAnimationAtom, asteroidParamsAtom } from '../../utils/atom';

export default function Asteroid({
    globeRef,
    onImpactComplete,
    onLoaded
}) {
    const impact = useAtomValue(impactAtom);
    const { visible, isAnimating } = useAtomValue(asteroidAnimationAtom);
    const { diameterM, speedKms } = useAtomValue(asteroidParamsAtom);
    const setAnimationState = useSetAtom(asteroidAnimationAtom);

    const asteroidRef = useRef(null);
    const animationRef = useRef(null);
    const startTimeRef = useRef(null);
    const sceneRef = useRef(null);

    const START_ALTITUDE = 3;
    const IMPACT_ALTITUDE = 0.01;
    
    // Calculate duration based on speed (11-72 km/s range)
    // Faster asteroids = shorter animation
    const DURATION_MS = 4000 - ((speedKms - 11) / (72 - 11)) * 2000; // 4000ms at 11km/s, 2000ms at 72km/s

    // Calculate rotation speed based on speed
    const ROTATION_SPEED = 0.02 + (speedKms / 72) * 0.08; // Faster rotation for faster asteroids

    // Load asteroid model ONCE
    useEffect(() => {
        if (!globeRef.current) return;

        if (!sceneRef.current) {
            sceneRef.current = globeRef.current.scene();
        }

        // Recreate asteroid if it was removed
        if (!asteroidRef.current) {
            console.log('🎨 Loading asteroid model, diameter:', diameterM, 'speed:', speedKms);

            const loader = new GLTFLoader();
            
            loader.load(
                '/models/Bennu.glb',
                (gltf) => {
                    console.log('✅ Asteroid model loaded successfully');
                    const asteroid = gltf.scene;
                    
                    // Scale: Bennu is ~500m in real life
                    const baseScale = diameterM / 500;
                    const visualScale = baseScale * 20;
                    
                    console.log('📏 Asteroid scale:', visualScale, 'for diameter:', diameterM);
                    asteroid.scale.set(visualScale, visualScale, visualScale);
                    
                    // Initial rotation
                    asteroid.rotation.set(0.5, 0.8, 0.3);
                    
                    sceneRef.current.add(asteroid);
                    asteroidRef.current = asteroid;

                    // Position it immediately at impact location
                    const coords = globeRef.current.getCoords(
                        impact.lat,
                        impact.lng,
                        START_ALTITUDE
                    );
                    asteroid.position.set(coords.x, coords.y, coords.z);
                    console.log('📍 Initial position:', coords);

                    if (onLoaded) {
                        onLoaded({ asteroid, impact });
                    }
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(0);
                        console.log(`Loading asteroid: ${percent}%`);
                    }
                },
                (error) => {
                    console.error('❌ Failed to load asteroid model:', error);
                    
                    // Fallback to visible cube
                    const cubeSize = 50;
                    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                    const material = new THREE.MeshBasicMaterial({ 
                        color: 0xff0000,
                        wireframe: false 
                    });
                    const cube = new THREE.Mesh(geometry, material);
                    
                    sceneRef.current.add(cube);
                    asteroidRef.current = cube;
                    
                    console.log('⚠️ Using fallback cube');
                }
            );
        }
    }, [globeRef, impact.lat, impact.lng, diameterM, speedKms]);

    // Update scale when diameter changes
    useEffect(() => {
        if (!asteroidRef.current) return;

        const baseScale = diameterM / 500;
        const visualScale = baseScale * 20;
        
        asteroidRef.current.scale.set(visualScale, visualScale, visualScale);
        console.log('📏 Scale updated to:', visualScale, 'for diameter:', diameterM);
    }, [diameterM]);

    // Reposition when impact changes
    useEffect(() => {
        if (!asteroidRef.current || !globeRef.current) return;

        console.log('📍 Repositioning asteroid to:', impact);

        const coords = globeRef.current.getCoords(
            impact.lat,
            impact.lng,
            START_ALTITUDE
        );
        asteroidRef.current.position.set(coords.x, coords.y, coords.z);
        asteroidRef.current.visible = true;
    }, [impact.lat, impact.lng]);

    // Animation function
    const animate = (currentTime) => {
        if (!startTimeRef.current) {
            startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / DURATION_MS, 1);

        const altitude = START_ALTITUDE - (START_ALTITUDE - IMPACT_ALTITUDE) * progress;

        if (asteroidRef.current && globeRef.current) {
            const coords = globeRef.current.getCoords(impact.lat, impact.lng, altitude);
            asteroidRef.current.position.set(coords.x, coords.y, coords.z);

            // Rotate asteroid as it falls - more visible rotation
            asteroidRef.current.rotation.x += ROTATION_SPEED;
            asteroidRef.current.rotation.y += ROTATION_SPEED * 0.7;
            asteroidRef.current.rotation.z += ROTATION_SPEED * 0.3;
        }

        if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            console.log('💥 Impact reached!');
            
            // Remove immediately on impact
            if (asteroidRef.current && sceneRef.current) {
                sceneRef.current.remove(asteroidRef.current);
                console.log('🗑️ Asteroid removed from scene');
                asteroidRef.current = null;
            }

            // Trigger explosion callback
            if (onImpactComplete) onImpactComplete();

            // Update state
            setAnimationState({ visible: false, isAnimating: false });

            startTimeRef.current = null;
        }
    };

    // Start animation when isAnimating becomes true
    useEffect(() => {
        if (isAnimating && asteroidRef.current) {
            console.log('🚀 Starting animation from altitude', START_ALTITUDE, 'duration:', DURATION_MS, 'ms');
            startTimeRef.current = null;
            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [isAnimating]);

    return null;
}