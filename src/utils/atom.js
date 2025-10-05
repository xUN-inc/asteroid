import { atom } from 'jotai'

export const impactAtom = atom({lat: 40.0, lng: 29.0})

export const asteroidParamsAtom = atom({
    diameterM: 200, 
    speedKms: 19, 
    angleDeg: 45
})

