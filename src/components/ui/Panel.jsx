// components/ui/Panel.tsx
import { motion } from "framer-motion";
import { useIsMobile } from "../../utils/useIsMobile";

export function Panel({ isOpen, from, width, children }) {
    const isMobile = useIsMobile();

    // On mobile: full width, slide from bottom
    // On desktop: normal behavior
    const mobileWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
    const finalWidth = isMobile ? mobileWidth : width;

    const x = isMobile ? 0 : (from === "left" ? -width : width);
    const y = isMobile ? 300 : 0; // Slide up from bottom on mobile

    return (
        <motion.aside
            initial={{
                x: isMobile ? 0 : x,
                y: isMobile ? y : 0,
                opacity: 0
            }}
            animate={{
                x: isOpen ? 0 : (isMobile ? 0 : x),
                y: isOpen ? 0 : (isMobile ? y : 0),
                opacity: isOpen ? 1 : 0
            }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            className={`
        absolute z-20 
        ${isMobile ? 'bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl pb-safe' : `top-16 ${from === "left" ? "left-0 border-r" : "right-0 border-l"} h-[calc(100vh-4rem)]`}
        ${isMobile ? '' : `w-[${width}px]`}
        overflow-y-auto 
        border-white/10 
        bg-neutral-900/95 
        backdrop-blur 
        ${isMobile ? 'border-t' : ''}
        ${isMobile ? 'p-4 pb-24' : 'p-4'}
    `}
            style={{
                width: isMobile ? '100%' : `${width}px`,
                pointerEvents: isOpen ? 'auto' : 'none'
            }}
        >
            {children}
        </motion.aside>
    );
}