import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function Asteroid({ 
    globeRef,        // Reference to your Globe component
    diameterM,       // Size from your slider
    visible = true,  // Show/hide asteroid
    onLoaded
}) {
    const asteroidRef = useRef(null);

    useEffect(() => {
        if (!globeRef?.current || !visible) return;

        // Get the Three.js scene from react-globe.gl
        const scene = globeRef.current.scene();
        if (!scene) return;

        const loader = new GLTFLoader();
        
        loader.load(
            '/models/Bennu.glb',
            (gltf) => {
                const asteroid = gltf.scene;
                
                // Scale based on diameter
                // Bennu is ~500m in real life, so we scale relative to that
                const scale = diameterM / 500 * 1000; // Adjust 0.01 for your globe size
                asteroid.scale.set(scale, scale, scale);
                
                // Position asteroid above Earth (starting position)
                asteroid.position.set(1000, 300, 0);
                
                // Add some rotation for visual interest
                asteroid.rotation.set(0.5, 0.8, 0.3);
                
                // Add to scene
                scene.add(asteroid);
                asteroidRef.current = asteroid;
                
                console.log('✅ Asteroid loaded and added to scene!');
                if (onLoaded) onLoaded(asteroid);
            },
            (progress) => {
                console.log(`Loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
            },
            (error) => {
                console.error('❌ Error loading asteroid:', error);
            }
        );

        // Cleanup when component unmounts
        return () => {
            if (asteroidRef.current && scene) {
                scene.remove(asteroidRef.current);
                asteroidRef.current = null;
            }
        };
    }, [globeRef, diameterM, visible, onLoaded]);

    // Optional: Animate rotation
    useEffect(() => {
        if (!asteroidRef.current) return;

        const animate = () => {
            if (asteroidRef.current) {
                asteroidRef.current.rotation.y += 0.001;
                requestAnimationFrame(animate);
            }
        };
        animate();
    }, [asteroidRef.current]);

    return null; // This component doesn't render anything in React DOM
}
