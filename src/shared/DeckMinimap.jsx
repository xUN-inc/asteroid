import React, { useMemo, useState, useCallback, useRef } from "react";
import DeckGL from "@deck.gl/react";
import { MapView } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer, GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

/** ---- helpers ---- **/

function zoomFromRadiusKm(rKm) {
    const z = 12 - Math.log2(Math.max(1, rKm) / 5);
    return Math.max(2, Math.min(16, Math.round(z)));
}

function circlePolygon([lng, lat], radiusKm, steps = 64) {
    const R = 6371000;
    const d = (radiusKm * 1000) / R;
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const coords = [];

    for (let i = 0; i <= steps; i++) {
        const b = (i / steps) * 2 * Math.PI;
        const sinLat = Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(b);
        const y = Math.asin(sinLat);
        const x = lngRad + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(latRad), Math.cos(d) - Math.sin(latRad) * sinLat);
        coords.push([(x * 180) / Math.PI, (y * 180) / Math.PI]);
    }

    return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
    };
}

/** ---- component ---- **/

function DeckMiniMapImpl({ impact, kpis }) {
    const deckRef = useRef(null);

    const initialViewState = useMemo(() => ({
        longitude: impact.lng,
        latitude: impact.lat,
        zoom: zoomFromRadiusKm(kpis.light || 10),
        pitch: 0,
        bearing: 0,
    }), [impact.lat, impact.lng, kpis.light]);

    const [viewState, setViewState] = useState(initialViewState);

    // Update view when impact changes
    useMemo(() => {
        setViewState(initialViewState);
    }, [initialViewState]);

    const handleZoom = useCallback((delta) => {
        setViewState(v => ({
            ...v,
            zoom: Math.max(1, Math.min(19, v.zoom + delta)),
        }));
    }, []);

    const tileLayer = useMemo(() => new TileLayer({
        id: 'basemap-tile-layer',
        data: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new BitmapLayer(props, {
                data: null,
                image: props.data,
                bounds: [west, south, east, north]
            });
        }
    }), []);

    const ringsLayer = useMemo(() => {
        const feats = [
            { r: kpis.light || 8 },
            { r: kpis.major || 5 },
            { r: kpis.severe || 3 },
        ].map((s) => circlePolygon([impact.lng, impact.lat], s.r));

        return new GeoJsonLayer({
            id: "impact-rings",
            data: { type: "FeatureCollection", features: feats },
            stroked: true,
            filled: true,
            getFillColor: (_f, { index }) => index === 0 ? [255, 255, 255, 60] : index === 1 ? [255, 153, 0, 50] : [255, 45, 45, 60],
            getLineColor: (_f, { index }) => index === 0 ? [255, 255, 255, 230] : index === 1 ? [255, 153, 0, 230] : [255, 45, 45, 230],
            getLineWidth: 2,
            lineWidthUnits: "pixels",
            pickable: false,
        });
    }, [impact.lng, impact.lat, kpis.light, kpis.major, kpis.severe]);

    const impactLayer = useMemo(
        () =>
            new ScatterplotLayer({
                id: "impact-point",
                data: [{ position: [impact.lng, impact.lat] }],
                getPosition: (d) => d.position,
                radiusUnits: "pixels",
                getRadius: 6,
                getFillColor: [255, 45, 45, 255],
                getLineColor: [255, 255, 255, 255],
                lineWidthMinPixels: 2,
                stroked: true,
                pickable: false,
            }),
        [impact.lng, impact.lat]
    );

    return (
        <div className="w-full h-full relative">
            <DeckGL
                ref={deckRef}
                views={[new MapView({ id: "mini", controller: true })]}
                initialViewState={initialViewState}
                viewState={viewState}
                onViewStateChange={({ viewState: vs }) => setViewState(vs)}
                controller={{ scrollZoom: true, dragPan: true, dragRotate: false, touchRotate: false, doubleClickZoom: true }}
                layers={[tileLayer, ringsLayer, impactLayer]}
                style={{ width: "100%", height: "100%" }}
            />

            <div className="absolute bottom-2 right-2 flex flex-col space-y-2">
                <button
                    onClick={() => handleZoom(+1)}
                    className="w-8 h-8 rounded bg-neutral-900/70 border border-white/20 text-white text-lg"
                >
                    +
                </button>
                <button
                    onClick={() => handleZoom(-1)}
                    className="w-8 h-8 rounded bg-neutral-900/70 border border-white/20 text-white text-lg"
                >
                    –
                </button>
            </div>
        </div>
    );
}

// Remove the remounting wrapper - just use stable key
export default function DeckMiniMap(props) {
    return <DeckMiniMapImpl key="deck-minimap-stable" {...props} />;
}