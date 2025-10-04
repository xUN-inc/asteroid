
import { motion } from "framer-motion";

export function Panel({ isOpen, from, width, children }) {
    const x = from === "left" ? -width : width;

    return (
        <motion.aside
            initial={{ x, opacity: 0 }}
            animate={{ x: isOpen ? 0 : x, opacity: isOpen ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            className={`absolute z-20 top-16 ${from === "left" ? "left-0 border-r" : "right-0 border-l"} w-[${width}px] h-[calc(100vh-4rem)] overflow-y-auto border-white/10 bg-neutral-900/50 backdrop-blur p-4`}
        >
            {children}
        </motion.aside>
    );
}
