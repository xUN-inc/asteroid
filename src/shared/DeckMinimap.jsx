import React, { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { MapView } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer, GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

/** ---- helpers (keep inside this file) ---- **/

// Same zoom heuristic you used before
function zoomFromRadiusKm(rKm) {
    const z = 12 - Math.log2(Math.max(1, rKm) / 5);
    return Math.max(4, Math.min(16, Math.round(z)));
}

// Make a circle polygon (lng/lat) with given radius in km
function circlePolygon([lng, lat], radiusKm, steps = 64) {
    const R = 6371000; // meters
    const d = (radiusKm * 1000) / R;
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const coords = [];

    for (let i = 0; i <= steps; i++) {
        const b = (i / steps) * 2 * Math.PI;
        const sinLat =
            Math.sin(latRad) * Math.cos(d) +
            Math.cos(latRad) * Math.sin(d) * Math.cos(b);
        const y = Math.asin(sinLat);
        const x =
            lngRad +
            Math.atan2(
                Math.sin(b) * Math.sin(d) * Math.cos(latRad),
                Math.cos(d) - Math.sin(latRad) * sinLat
            );
        coords.push([(x * 180) / Math.PI, (y * 180) / Math.PI]);
    }

    return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
    };
}

/** ---- component ---- **/

export default function DeckMiniMap({
                                        impact, // {lat, lng}
                                        kpis,   // {severe, major, light}
                                        width = 520,
                                        height = 360,
                                        onHide,
                                    }) {
    const viewState = useMemo(
        () => ({
            longitude: impact.lng,
            latitude: impact.lat,
            zoom: zoomFromRadiusKm(kpis.light || 10),
            pitch: 0,
            bearing: 0,
        }),
        [impact.lat, impact.lng, kpis.light]
    );

    // OSM raster tiles (with city names/roads)
    const tileLayer = useMemo(
        () =>
            new TileLayer({
                id: "osm-tiles",
                data: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", // no {s}
                minZoom: 0,
                maxZoom: 19,
                tileSize: 256,
                loadOptions: { image: { crossOrigin: "anonymous" } }, // allow CORS
                renderSubLayers: (props) => {
                    const {
                        bbox: { left, bottom, right, top },
                    } = props.tile;
                    return new BitmapLayer(props, {
                        id: `${props.id}-bmp`,
                        image: props.data,                    // DeckGL supplies the tile image
                        bounds: [left, bottom, right, top],   // [minX, minY, maxX, maxY] in lng/lat
                    });
                },
            }),
        []
    );


    // Impact rings
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
            getFillColor: (_f, { index }) =>
                index === 0 ? [255, 255, 255, 60] : index === 1 ? [255, 153, 0, 50] : [255, 45, 45, 60],
            getLineColor: (_f, { index }) =>
                index === 0 ? [255, 255, 255, 230] : index === 1 ? [255, 153, 0, 230] : [255, 45, 45, 230],
            getLineWidth: 2,
            lineWidthUnits: "pixels",
            pickable: false,
        });
    }, [impact.lng, impact.lat, kpis.light, kpis.major, kpis.severe]);

    // Impact point
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
        <div
            className="impact-map-window fixed right-4 bottom-20 z-40 rounded-2xl overflow-hidden border border-white/10 bg-[#111]"
            style={{ width, height }}
        >
            <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/80 border-b border-white/10">
                <div className="text-sm font-semibold">Impact minimap (deck.gl)</div>
                <button
                    onClick={onHide}
                    className="text-xs px-2 py-1 rounded-md border border-white/10 bg-neutral-800/60"
                >
                    Hide
                </button>
            </div>

            <DeckGL
                views={[new MapView({ id: "mini", controller: true })]}
                viewState={{ mini: viewState }}
                controller={{ dragRotate: false, touchRotate: false }}
                layers={[tileLayer, ringsLayer, impactLayer]}
                style={{ width: "100%", height: "calc(100% - 36px)" }}
            />
        </div>
    );
}
