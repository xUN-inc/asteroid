import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Asteroid({ 
    globeRef,
    impact,
    onLoaded
}) {
    const asteroidRef = useRef(null);

    // Create the cube and add it to the globe scene
    useEffect(() => {
        if (!globeRef.current || asteroidRef.current) return;

        console.log('🎨 Creating asteroid cube at:', impact);
        
        // Create red cube
        const geometry = new THREE.BoxGeometry(20, 20, 20);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        
        // Position it at impact location, high altitude
        const coords = globeRef.current.getCoords(impact.lat, impact.lng, 2);
        cube.position.set(coords.x, coords.y, coords.z);
        
        // Add to globe's scene
        const scene = globeRef.current.scene();
        scene.add(cube);
        
        asteroidRef.current = cube;
        
        if (onLoaded) {
            onLoaded({ cube, impact });
        }

        // Cleanup when component unmounts
        return () => {
            console.log('🧹 Removing asteroid cube');
            if (asteroidRef.current) {
                scene.remove(asteroidRef.current);
                geometry.dispose();
                material.dispose();
                asteroidRef.current = null;
            }
        };
    }, [globeRef, impact.lat, impact.lng]);

    return null;
}