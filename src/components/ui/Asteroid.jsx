import { useEffect } from 'react';

export default function Asteroid({ 
    impact,
    onLoaded
}) {
    useEffect(() => {
        console.log('🌍 Asteroid tracking impact:', impact);
        if (onLoaded) {
            onLoaded({ impact });
        }
    }, [impact, onLoaded]);

    return null;
}