

export const pageVariants: any = {
    initial: {
        opacity: 0,
        y: 20,
        filter: "blur(10px)",
        scale: 0.98
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        scale: 1,
        transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1]
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        filter: "blur(10px)",
        scale: 0.98,
        transition: {
            duration: 0.4,
            ease: "easeInOut"
        }
    }
};

export const staggerContainer: any = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

export const fadeInUp: any = {
    hidden: {
        opacity: 0,
        y: 30,
        scale: 0.95
    },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            bounce: 0.3,
            duration: 0.8
        }
    }
};

export const scaleIn: any = {
    hidden: { opacity: 0, scale: 0.9 },
    show: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 20
        }
    }
};
