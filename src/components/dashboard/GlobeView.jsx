import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

export function GlobeView({ 
    globeRef, 
    countries, 
    selectedCountry, 
    onPolygonClick, 
    onGlobeClick, 
    points, 
    hexResolution, 
    maxWeight, 
    colorScale, 
    ringsData, 
    cityLabels, 
    impact,
}) {
    const canWebGL = typeof window !== 'undefined' && 'WebGLRenderingContext' in window;
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };
        
        // Listen for resize events
        window.addEventListener('resize', handleResize);
        
        // Trigger initial resize after a short delay to ensure proper initialization
        const timer = setTimeout(handleResize, 100);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0">
            {canWebGL ? (
                <>
                    <Globe
                        key="single-globe-instance"
                        ref={globeRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                        polygonsData={countries}
                        polygonCapColor={(d) =>
                            (d.properties?.name === selectedCountry) ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.08)"
                        }
                        polygonSideColor={() => "rgba(255,255,255,0.15)"}
                        polygonStrokeColor={() => "#6b7280"}
                        polygonAltitude={(d) => (d.properties?.name === selectedCountry ? 0.02 : 0.004)}
                        polygonLabel={(d) => `<div style={{padding:'4px 6px'}}><b>${d.properties?.name || "Country"}</b></div>`}
                        onPolygonClick={onPolygonClick}
                        onGlobeClick={onGlobeClick}

                        hexBinPoints={points}
                        hexBinPointLat={(d) => d.lat}
                        hexBinPointLng={(d) => d.lng}
                        hexBinPointWeight={(d) => d.weight}
                        hexBinResolution={hexResolution}
                        hexMargin={0.08}
                        hexTopColor={(d) => colorScale(d.sumWeight / maxWeight)}
                        hexSideColor={(d) => colorScale(d.sumWeight / maxWeight)}
                        hexAltitude={(d) => (d.sumWeight / maxWeight) * 0.5}

                        ringsData={ringsData}
                        ringColor={(r) => r.color}
                        ringMaxRadius={(r) => r.maxR}
                        ringPropagationSpeed={(r) => r.speed ?? 20}
                        ringRepeatPeriod={(r) => r.repeatPeriod}

                        labelsData={cityLabels}
                        labelLat={(d) => d.lat}
                        labelLng={(d) => d.lng}
                        labelText={(d) => d.name}
                        labelSize={(d) => {
                            const max = 1000;
                            const closeness = Math.max(0, 1 - (d._d || 0) / max);
                            return 0.7 + 0.5 * closeness;
                        }}
                        labelDotRadius={() => 0.0}
                        labelColor={() => 'rgba(255,255,255,0.9)'}
                        labelResolution={2}

                        atmosphereColor="#88bbff"
                        atmosphereAltitude={0.18}
                        showAtmosphere
                        enablePointerInteraction
                    />
                </>
            ) : (
                <div className="p-4">WebGL not available</div>
            )}
        </div>
    );
}