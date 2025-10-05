import { atom } from 'jotai'

export const impactAtom = atom({lat: 40.0, lng: 29.0})

export const asteroidParamsAtom = atom({
    diameterM: 200, 
    speedKms: 19, 
    angleDeg: 45
})


// To this:
export const asteroidAnimationAtom = atom({
    visible: true,  // ← Start as visible so we can see it
    isAnimating: false
})