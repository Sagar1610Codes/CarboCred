/* ═══════════════════════════════════════════════════════════════════
   HowItWorksAnimated.jsx
   Scroll-driven vertical process timeline for CarboCred
   Stack: React 19 · Framer Motion · Tailwind CSS
   ═══════════════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useState } from 'react';
import {
    motion,
    useScroll,
    useTransform,
    useSpring,
    useInView,
    useMotionValue,
    useAnimationFrame,
    useVelocity,
} from 'framer-motion';

const ParallaxContext = React.createContext({ z: 0 });

function ParallaxLayer({ children, multiplier = 1, style = {} }) {
    const { z } = React.useContext(ParallaxContext);
    const layerZ = useTransform(z, (v) => v * multiplier);
    return (
        <motion.div style={{ z: layerZ, transformStyle: 'preserve-3d', ...style }}>
            {children}
        </motion.div>
    );
}

/* ── Shared spring config ─────────────────────────────────────────── */
const SPRING_ELASTIC = { type: 'spring', stiffness: 260, damping: 16 };
const SPRING_BOUNCE = { type: 'spring', stiffness: 400, damping: 14 };
const SPRING_CLUNK = { type: 'spring', stiffness: 600, damping: 20 };
const SPRING_PHYSICS = { type: 'spring', stiffness: 150, damping: 30, mass: 0.5 };

/* ═══════════════════════════════════════════════════════════════════
   PARTICLE EXPLOSION — burst of particles for the finality event
   ═══════════════════════════════════════════════════════════════════ */
function ParticleExplosion({ trigger, color1 = '#10b981', color2 = '#3b82f6', count = 40 }) {
    const particles = React.useMemo(() =>
        Array.from({ length: count }, (_, i) => ({
            id: i,
            angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
            speed: Math.random() * 200 + 100,
            size: Math.random() * 4 + 2,
            color: i % 2 === 0 ? color1 : color2,
            delay: Math.random() * 0.1,
        })),
        [count, color1, color2]
    );

    if (!trigger) return null;

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                        x: Math.cos(p.angle) * p.speed,
                        y: Math.sin(p.angle) * p.speed,
                        opacity: 0,
                        scale: 0,
                    }}
                    transition={{
                        duration: 1.2,
                        ease: "easeOut",
                        delay: p.delay,
                    }}
                />
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ENERGY PULSE — a rapid segment shooting down a path
   ═══════════════════════════════════════════════════════════════════ */
function EnergyPulse({ d, trigger, color = '#10b981' }) {
    return (
        <motion.path
            d={d}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            filter="url(#lineGlow)"
            initial={{ pathLength: 0.1, pathOffset: 0, opacity: 0 }}
            animate={trigger ? {
                pathOffset: [0, 1],
                opacity: [0, 1, 1, 0],
            } : { opacity: 0 }}
            transition={{
                duration: 0.8,
                ease: "easeInOut",
            }}
        />
    );
}

/* ═══════════════════════════════════════════════════════════════════
   FLOATING PARTICLE — reusable glowing dot that drifts
   ═══════════════════════════════════════════════════════════════════ */
function FloatingParticle({ color = '#10b981', size = 4, delay = 0, duration = 3 }) {
    return (
        <motion.div
            style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 ${size * 3}px ${color}`,
                pointerEvents: 'none',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: [0, 1, 0.7, 1, 0],
                scale: [0, 1, 1.4, 1, 0],
                y: [0, -20, -10, -30, -50],
                x: [0, 10, -5, 8, -10],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                repeatDelay: Math.random() * 2,
                ease: 'easeInOut',
            }}
        />
    );
}

/* ═══════════════════════════════════════════════════════════════════
   PARTICLE FIELD — cloud of particles that assemble into an icon
   ═══════════════════════════════════════════════════════════════════ */
function AssemblingParticles({ isVisible, color, count = 18 }) {
    const particles = React.useMemo(() =>
        Array.from({ length: count }, (_, i) => ({
            id: i,
            startX: (Math.random() - 0.5) * 200,
            startY: (Math.random() - 0.5) * 200,
            endX: (Math.random() - 0.5) * 10,
            endY: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 2,
            delay: Math.random() * 0.4,
        })),
        [count]
    );

    return (
        <>
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: color,
                        boxShadow: `0 0 ${p.size * 2}px ${color}`,
                        top: '50%',
                        left: '50%',
                        pointerEvents: 'none',
                        zIndex: 5,
                    }}
                    animate={isVisible ? {
                        x: [p.startX, p.endX],
                        y: [p.startY, p.endY],
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                    } : { x: p.startX, y: p.startY, opacity: 0 }}
                    transition={{
                        ...SPRING_ELASTIC,
                        delay: p.delay,
                        duration: 1.2,
                    }}
                />
            ))}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   PULSE RIPPLE — expanding ring on "block lock" finale
   ═══════════════════════════════════════════════════════════════════ */
function PulseRipple({ trigger, color }) {
    return (
        <>
            {[0, 0.3, 0.6].map((delay, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: 'absolute',
                        borderRadius: '50%',
                        border: `1.5px solid ${color}`,
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 0,
                    }}
                    animate={trigger ? {
                        width: ['0px', '220px'],
                        height: ['0px', '220px'],
                        opacity: [0.9, 0],
                        marginTop: ['0px', '-110px'],
                        marginLeft: ['0px', '-110px'],
                    } : { width: 0, height: 0, opacity: 0 }}
                    transition={{
                        duration: 1.8,
                        delay: delay + 0.1,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ICON CONTAINERS
   ═══════════════════════════════════════════════════════════════════ */

/** SVG: User / identity icon */
function IdentityIcon() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <defs>
                <radialGradient id="idGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="26" cy="18" r="9" stroke="#10b981" strokeWidth="2" fill="none" />
            <path d="M8 44c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Chain link accent */}
            <circle cx="26" cy="18" r="4" fill="#10b981" fillOpacity="0.25" />
            <path d="M38 10 L44 4 M14 10 L8 4" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <motion.circle
                cx="26" cy="18" r="12"
                stroke="#10b981" strokeWidth="1"
                fill="none" strokeOpacity="0.4"
                strokeDasharray="6 4"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{ originX: '26px', originY: '18px', transformOrigin: '26px 18px' }}
            />
        </svg>
    );
}

/** SVG: Sprouting tree with circuit board branches */
function TreeCircuitIcon({ animate: shouldAnimate }) {
    const branchVariants = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: (i) => ({
            pathLength: 1,
            opacity: 1,
            transition: { ...SPRING_BOUNCE, delay: i * 0.15, duration: 0.7 },
        }),
    };

    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            {/* Trunk */}
            <motion.line x1="26" y1="46" x2="26" y2="28"
                stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={shouldAnimate ? { pathLength: 1 } : {}}
                transition={{ duration: 0.5 }}
            />
            {/* Main branches */}
            {[
                "M26 36 L14 24", "M26 36 L38 24",
                "M26 30 L18 18", "M26 30 L34 18",
                "M14 24 L8 20", "M38 24 L44 20",
            ].map((d, i) => (
                <motion.path key={i} d={d} stroke="#10b981" strokeWidth="1.8"
                    strokeLinecap="round" fill="none"
                    variants={branchVariants} custom={i}
                    initial="hidden" animate={shouldAnimate ? "visible" : "hidden"}
                />
            ))}
            {/* Terminal dots (circuit nodes) */}
            {[[8, 20], [44, 20], [18, 18], [34, 18], [14, 24], [38, 24]].map(([x, y], i) => (
                <motion.circle key={i} cx={x} cy={y} r="2.5"
                    fill="#10b981" fillOpacity="0.8"
                    initial={{ scale: 0 }} animate={shouldAnimate ? { scale: 1 } : {}}
                    transition={{ ...SPRING_BOUNCE, delay: 0.6 + i * 0.08 }}
                />
            ))}
            {/* Seed base */}
            <motion.ellipse cx="26" cy="46" rx="5" ry="3"
                fill="#059669" fillOpacity="0.6"
                initial={{ scaleX: 0 }} animate={shouldAnimate ? { scaleX: 1 } : {}}
                transition={{ duration: 0.3 }}
            />
        </svg>
    );
}

/** SVG: Wireframe cube (spins then solidifies) */
function CubeIcon({ animate: shouldAnimate }) {
    const [solid, setSolid] = useState(false);
    useEffect(() => {
        if (shouldAnimate) {
            const t = setTimeout(() => setSolid(true), 900);
            return () => clearTimeout(t);
        }
        setSolid(false);
    }, [shouldAnimate]);

    return (
        <motion.div
            style={{ width: 52, height: 52, position: 'relative' }}
            animate={shouldAnimate ? { rotate: [0, 360, 360] } : { rotate: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
        >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                {/* Front face */}
                <motion.rect x="12" y="18" width="22" height="22" rx="2"
                    stroke="#3b82f6" strokeWidth="2"
                    fill={solid ? 'rgba(59,130,246,0.18)' : 'none'}
                    animate={{ fill: solid ? 'rgba(59,130,246,0.18)' : 'none' }}
                    transition={{ duration: 0.3 }}
                />
                {/* Back face */}
                <motion.rect x="18" y="12" width="22" height="22" rx="2"
                    stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5"
                    fill="none"
                />
                {/* Connecting lines */}
                {[[12, 18, 18, 12], [34, 18, 40, 12], [12, 40, 18, 34], [34, 40, 40, 34]].map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.6"
                    />
                ))}
                {/* Central atom dot */}
                {solid && (
                    <motion.circle cx="26" cy="26" r="4"
                        fill="#3b82f6" fillOpacity="0.7"
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={SPRING_CLUNK}
                    />
                )}
            </svg>
            {/* Impact shockwave */}
            {solid && (
                <motion.div
                    style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: '2px solid #3b82f6',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                    }}
                    initial={{ width: 0, height: 0, opacity: 1 }}
                    animate={{ width: 80, height: 80, opacity: 0, marginTop: -40, marginLeft: -40 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            )}
        </motion.div>
    );
}

/** SVG: Padlock integrating into a blockchain block */
function LockBlockIcon({ animate: shouldAnimate, locked }) {
    return (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            {/* Block */}
            <motion.rect x="8" y="24" width="40" height="26" rx="4"
                stroke="#10b981" strokeWidth="2"
                fill="rgba(16,185,129,0.12)"
                initial={{ scaleY: 0, y: 30 }}
                animate={shouldAnimate ? { scaleY: 1, y: 0 } : {}}
                transition={SPRING_CLUNK}
                style={{ originY: '50px' }}
            />
            {/* Grid lines inside block */}
            {shouldAnimate && [32, 38].map(y => (
                <motion.line key={y} x1="12" y1={y} x2="44" y2={y}
                    stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.4"
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    style={{ transformOrigin: '12px center' }}
                />
            ))}
            {/* Padlock body */}
            <motion.rect x="19" y="28" width="18" height="14" rx="3"
                stroke="#f59e0b" strokeWidth="2"
                fill="rgba(245,158,11,0.15)"
                initial={{ scale: 0 }} animate={shouldAnimate ? { scale: 1 } : {}}
                transition={{ ...SPRING_CLUNK, delay: 0.3 }}
            />
            {/* Padlock shackle */}
            <motion.path d="M22 28 V22 a6 6 0 0 1 12 0 V28"
                stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={shouldAnimate ? { pathLength: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
            />
            {/* Keyhole */}
            {locked && (
                <motion.circle cx="28" cy="34" r="3"
                    fill="#f59e0b"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={SPRING_BOUNCE}
                />
            )}
        </svg>
    );
}

/* ═════════════════════════════════════════════════════════════════
   STEP CARD — glassmorphism wrapper with glow border
   ═════════════════════════════════════════════════════════════════ */
const cardVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.9 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: SPRING_ELASTIC,
    },
};

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: SPRING_ELASTIC },
};

function StepCard({ children, color = '#10b981', style = {}, className = '' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-80px 0px' });

    // Mouse interaction values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isHovered, setIsHovered] = useState(false);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

    // Z-axis pop out — use a MotionValue so the spring reacts to state changes
    const zMotion = useMotionValue(0);
    const zDepth = useSpring(zMotion, SPRING_PHYSICS);
    useEffect(() => {
        zMotion.set(isHovered ? 40 : 0);
    }, [isHovered, zMotion]);

    // Spring interpolation for smoothness
    const springRotateX = useSpring(rotateX, SPRING_PHYSICS);
    const springRotateY = useSpring(rotateY, SPRING_PHYSICS);

    // Glare position
    const glareX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
    const glareY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set((e.clientX - centerX) / rect.width);
        mouseY.set((e.clientY - centerY) / rect.height);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={ref}
            className={className}
            variants={cardVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                handleMouseLeave();
                setIsHovered(false);
            }}
            style={{
                perspective: 1200,
                transformStyle: 'preserve-3d',
                ...style,
            }}
        >
            <motion.div
                style={{
                    background: 'rgba(13,21,37,0.85)',
                    border: `1px solid ${color}30`,
                    borderRadius: 20,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}18, 0 0 40px ${color}10`,
                    padding: '28px 32px',
                    position: 'relative',
                    // overflow must NOT be 'hidden' or it clips Z-translated children
                    rotateX: springRotateX,
                    rotateY: springRotateY,
                    height: '100%',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* 3D dynamic glare effect */}
                <motion.div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `radial-gradient(circle at ${glareX} ${glareY}, ${color}15 0%, transparent 60%)`,
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                />

                {/* Glow corner accent */}
                <div style={{
                    position: 'absolute', top: -60, right: -60,
                    width: 160, height: 160, borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
                    pointerEvents: 'none',
                    zIndex: 0,
                }} />

                <div style={{ position: 'relative', zIndex: 2, transformStyle: 'preserve-3d' }}>
                    <ParallaxContext.Provider value={{ z: zDepth }}>
                        <motion.div style={{ z: zDepth }}>
                            {children}
                        </motion.div>
                    </ParallaxContext.Provider>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ═════════════════════════════════════════════════════════════════
   BADGE LABEL
   ═════════════════════════════════════════════════════════════════ */
function StepBadge({ label, color }) {
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: `${color}18`, border: `1px solid ${color}40`,
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color, marginBottom: 14,
        }}>
            {label}
        </div>
    );
}

/* ═════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════════ */
export default function HowItWorksAnimated() {
    const sectionRef = useRef(null);
    const svgRef = useRef(null);

    /* ── Scroll tracking ──────────────────────────────────────────── */
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start 0.9', 'end 0.1'],
    });

    /* Smooth the raw scroll value */
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 80,
        damping: 25,
        restDelta: 0.001,
    });

    /* ── SVG line dimensions (set after mount) ───────────────────── */
    const [svgHeight, setSvgHeight] = useState(1000);
    const [svgWidth, setSvgWidth] = useState(60);
    useEffect(() => {
        const update = () => {
            if (sectionRef.current) {
                setSvgHeight(sectionRef.current.offsetHeight);
                setSvgWidth(sectionRef.current.offsetWidth);
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    /* ── Derived transforms for the SVG path draw ────────────────── */
    const lineDrawLength = useTransform(smoothProgress, [0, 1], [0, 1]);

    /* Progress thresholds for each step */
    const step1Progress = useTransform(smoothProgress, [0, 0.25], [0, 1]);
    const step2Progress = useTransform(smoothProgress, [0.2, 0.55], [0, 1]);
    const step3Progress = useTransform(smoothProgress, [0.5, 0.85], [0, 1]);

    /* ── InView triggers per step ────────────────────────────────── */
    const step1Ref = useRef(null);
    const step2Ref = useRef(null);
    const step3Ref = useRef(null);
    const step1InView = useInView(step1Ref, { once: true, margin: '-60px 0px' });
    const step2InView = useInView(step2Ref, { once: true, margin: '-60px 0px' });
    const step3InView = useInView(step3Ref, { once: true, margin: '-60px 0px' });

    /* Particle glow that travels down the line */
    const [particleY, setParticleY] = useState(0);
    useEffect(() => {
        const unsub = smoothProgress.on('change', v => {
            setParticleY(v * svgHeight);
        });
        return unsub;
    }, [smoothProgress, svgHeight]);

    /* Locked state for the finale block */
    const [locked, setLocked] = useState(false);
    useEffect(() => {
        if (step3InView) {
            const t = setTimeout(() => setLocked(true), 1000);
            return () => clearTimeout(t);
        }
        setLocked(false);
    }, [step3InView]);

    /* ── Pulse states ────────────────────────────────────────────── */
    const [pulse1, setPulse1] = useState(false);
    const [pulse2L, setPulse2L] = useState(false);
    const [pulse2R, setPulse2R] = useState(false);
    const [pulse3, setPulse3] = useState(false);

    const triggerPulse = (type) => {
        if (type === '1') { setPulse1(true); setTimeout(() => setPulse1(false), 800); }
        if (type === '2L') { setPulse2L(true); setTimeout(() => setPulse2L(false), 800); }
        if (type === '2R') { setPulse2R(true); setTimeout(() => setPulse2R(false), 800); }
        if (type === '3') { setPulse3(true); setTimeout(() => setPulse3(false), 800); }
    };

    /* ── SVG Path definitions ───────────────────────────────────── */
    const cx = svgWidth / 2;       // center x
    const topY = 40;                 // start of line
    const botY = svgHeight - 40;    // end of line

    // Fork Y: roughly 38% down
    const forkY = topY + (botY - topY) * 0.38;
    // Merge Y: roughly 68% down
    const mergeY = topY + (botY - topY) * 0.68;

    // Main trunk path (straight)
    const trunkPath = `M ${cx} ${topY} L ${cx} ${forkY}`;

    // Left branch (seller)
    const leftBranchPath =
        `M ${cx} ${forkY}` +
        ` C ${cx} ${forkY + 40}, ${cx - 160} ${forkY + 40}, ${cx - 160} ${forkY + 80}` +
        ` L ${cx - 160} ${mergeY - 80}` +
        ` C ${cx - 160} ${mergeY - 40}, ${cx} ${mergeY - 40}, ${cx} ${mergeY}`;

    // Right branch (buyer)
    const rightBranchPath =
        `M ${cx} ${forkY}` +
        ` C ${cx} ${forkY + 40}, ${cx + 160} ${forkY + 40}, ${cx + 160} ${forkY + 80}` +
        ` L ${cx + 160} ${mergeY - 80}` +
        ` C ${cx + 160} ${mergeY - 40}, ${cx} ${mergeY - 40}, ${cx} ${mergeY}`;

    // Lower trunk (after merge)
    const lowerTrunkPath = `M ${cx} ${mergeY} L ${cx} ${botY}`;

    return (
        <section
            ref={sectionRef}
            id="how-it-works"
            style={{
                position: 'relative',
                padding: '100px 0 80px',
                overflow: 'hidden',
            }}
        >
            {/* ── Background ambience ──────────────────────────────────── */}
            <div style={{
                position: 'absolute', inset: 0,
                background:
                    'radial-gradient(ellipse 70% 40% at 50% 10%, rgba(16,185,129,0.07) 0%, transparent 60%),' +
                    'radial-gradient(ellipse 50% 30% at 20% 60%, rgba(59,130,246,0.06) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            {/* ── Section header ───────────────────────────────────────── */}
            <div style={{ textAlign: 'center', marginBottom: 64, position: 'relative', zIndex: 2 }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={SPRING_ELASTIC}
                >
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '5px 16px', borderRadius: 999,
                        background: 'rgba(16,185,129,0.12)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#10b981',
                        marginBottom: 18,
                    }}>
                        <span style={{
                            display: 'inline-block', width: 6, height: 6,
                            borderRadius: '50%', background: '#10b981',
                            boxShadow: '0 0 8px #10b981',
                            animation: 'pulse 2s infinite',
                        }} />
                        On-Chain Process
                    </span>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...SPRING_ELASTIC, delay: 0.1 }}
                    style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        color: '#f1f5f9',
                        lineHeight: 1.2,
                        marginBottom: 14,
                    }}
                >
                    How{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        CarboCred
                    </span>{' '}
                    Works
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...SPRING_ELASTIC, delay: 0.2 }}
                    style={{
                        color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7,
                        maxWidth: 540, margin: '0 auto',
                    }}
                >
                    A decentralised protocol that transforms ecological impact into
                    verified, tradeable on-chain assets — from registration to permanent retirement.
                </motion.p>
            </div>

            {/* ══════════════════════════════════════════════════════════
          LAYOUT: SVG SPINE (absolute) + CONTENT COLUMN (relative)
          ══════════════════════════════════════════════════════════ */}
            <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

                {/* ── Animated SVG spine ─────────────────────────────────── */}
                <svg
                    ref={svgRef}
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: svgHeight,
                        pointerEvents: 'none',
                        zIndex: 1,
                        overflow: 'visible',
                    }}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="none"
                >
                    <defs>
                        {/* Green neon gradient for trunk */}
                        <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
                        </linearGradient>

                        {/* Branch gradients */}
                        <linearGradient id="leftBranchGrad" x1="1" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                        </linearGradient>
                        <linearGradient id="rightBranchGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                        </linearGradient>

                        {/* Glow filter */}
                        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Soft glow for particle */}
                        <filter id="particleGlow">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Ghost track (full opacity dim line under) */}
                    <line x1={cx} y1={topY} x2={cx} y2={botY}
                        stroke="rgba(255,255,255,0.04)" strokeWidth="2"
                    />

                    {/* ── Trunk (animated draw) ──────────────────────────── */}
                    <motion.line
                        x1={cx} y1={topY} x2={cx} y2={forkY}
                        stroke="url(#trunkGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter="url(#lineGlow)"
                        style={{ pathLength: step1Progress }}
                        initial={{ pathLength: 0 }}
                    />

                    {/* ── Left branch ────────────────────────────────────── */}
                    <motion.path
                        d={leftBranchPath}
                        stroke="url(#leftBranchGrad)"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        filter="url(#lineGlow)"
                        style={{ pathLength: step2Progress }}
                        initial={{ pathLength: 0 }}
                    />

                    {/* ── Right branch ───────────────────────────────────── */}
                    <motion.path
                        d={rightBranchPath}
                        stroke="url(#rightBranchGrad)"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        filter="url(#lineGlow)"
                        style={{ pathLength: step2Progress }}
                        initial={{ pathLength: 0 }}
                    />

                    {/* ── Lower trunk ────────────────────────────────────── */}
                    <motion.line
                        x1={cx} y1={mergeY} x2={cx} y2={botY}
                        stroke="url(#trunkGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter="url(#lineGlow)"
                        style={{ pathLength: step3Progress }}
                        initial={{ pathLength: 0 }}
                    />

                    {/* ── Energy Pulses (Reactive layers) ────────────────── */}
                    <EnergyPulse d={trunkPath} trigger={pulse1} color="#10b981" />
                    <EnergyPulse d={leftBranchPath} trigger={pulse2L} color="#10b981" />
                    <EnergyPulse d={rightBranchPath} trigger={pulse2R} color="#3b82f6" />
                    <EnergyPulse d={lowerTrunkPath} trigger={pulse3} color="#f59e0b" />

                    {/* ── Travelling particle along the line ─────────────── */}
                    <motion.circle
                        cx={cx}
                        cy={particleY}
                        r="5"
                        fill="#10b981"
                        filter="url(#particleGlow)"
                        style={{ opacity: lineDrawLength }}
                    />
                    {/* Secondary trailing particles */}
                    {[-18, -36].map((offset, i) => (
                        <motion.circle
                            key={i}
                            cx={cx}
                            cy={Math.max(topY, particleY + offset)}
                            r={3 - i}
                            fill="#10b981"
                            fillOpacity={0.5 - i * 0.2}
                            filter="url(#particleGlow)"
                        />
                    ))}

                    {/* ── Node dots at junction points ───────────────────── */}
                    {[
                        { cy: forkY, show: step2InView },
                        { cy: mergeY, show: step3InView },
                    ].map(({ cy: dotY, show }, i) => (
                        <motion.circle
                            key={i}
                            cx={cx} cy={dotY} r={6}
                            fill="#060b14"
                            stroke="#10b981"
                            strokeWidth="2"
                            filter="url(#lineGlow)"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={show ? { scale: 1, opacity: 1 } : {}}
                            transition={SPRING_BOUNCE}
                        />
                    ))}
                </svg>

                {/* ══════════════════════════════════════════════════════
            STEP 1: ONBOARDING — CENTER
            ══════════════════════════════════════════════════════ */}
                <div ref={step1Ref} style={{
                    display: 'flex', justifyContent: 'center',
                    marginBottom: 80, position: 'relative', zIndex: 2,
                }}>
                    <StepCard color="#10b981" style={{ maxWidth: 520, width: '100%' }}>
                        <StepBadge label="Step 1 · Onboarding" color="#10b981" />

                        {/* Icon with particle assembly */}
                        <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 20 }}>
                            <div
                                onMouseEnter={() => triggerPulse('1')}
                                style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.12)',
                                    border: '1.5px solid rgba(16,185,129,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 30px rgba(16,185,129,0.25)',
                                    position: 'relative', overflow: 'visible',
                                    cursor: 'pointer',
                                }}>
                                <ParallaxLayer multiplier={2}>
                                    <AssemblingParticles isVisible={step1InView} color="#10b981" count={20} />
                                    <motion.div
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={step1InView ? { scale: 1, rotate: 0 } : {}}
                                        transition={{ ...SPRING_ELASTIC, delay: 0.4 }}
                                    >
                                        <IdentityIcon />
                                    </motion.div>
                                </ParallaxLayer>
                            </div>
                            {/* Orbiting ring */}
                            <motion.div
                                style={{
                                    position: 'absolute', inset: -8,
                                    borderRadius: '50%',
                                    border: '1px dashed rgba(16,185,129,0.35)',
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate={step1InView ? 'visible' : 'hidden'}
                        >
                            <motion.h3
                                variants={itemVariants}
                                style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    fontSize: '1.25rem', fontWeight: 800,
                                    color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.01em',
                                }}
                            >
                                1. Digital Identity &amp; Verification
                            </motion.h3>
                            <motion.p
                                variants={itemVariants}
                                style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 16 }}
                            >
                                Connect your wallet and verify your entity status on-chain.
                                Our smart contract registry gates access to the marketplace —
                                ensuring every participant is a real, accountable actor.
                            </motion.p>
                            <motion.div
                                variants={itemVariants}
                                style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                            >
                                {['Wallet Connect', 'KYC On-Chain', 'Entity Registry'].map(tag => (
                                    <span key={tag} style={{
                                        padding: '3px 10px', borderRadius: 999,
                                        background: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.25)',
                                        fontSize: '0.72rem', color: '#10b981', fontWeight: 600,
                                    }}>{tag}</span>
                                ))}
                            </motion.div>
                        </motion.div>
                    </StepCard>
                </div>

                {/* ══════════════════════════════════════════════════════
            STEP 2: THE FORK — TWO COLUMNS
            ══════════════════════════════════════════════════════ */}
                <div ref={step2Ref} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 32,
                    marginBottom: 80,
                    position: 'relative',
                    zIndex: 2,
                }}>

                    {/* ── Seller (Left) ─────────────────────────────────── */}
                    <StepCard color="#10b981">
                        <StepBadge label="Seller Route · Step 2a" color="#10b981" />

                        <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 20 }}>
                            <div
                                onMouseEnter={() => triggerPulse('2L')}
                                style={{
                                    width: 80, height: 80, borderRadius: 20,
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1.5px solid rgba(16,185,129,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 30px rgba(16,185,129,0.2)',
                                    overflow: 'visible', position: 'relative',
                                    cursor: 'pointer',
                                }}>
                                <ParallaxLayer multiplier={2}>
                                    <TreeCircuitIcon animate={step2InView} />
                                </ParallaxLayer>
                            </div>
                            {/* Floating mini particles */}
                            {step2InView && [0, 0.4, 0.8, 1.2].map((d, i) => (
                                <FloatingParticle key={i} color="#10b981" size={3 + i} delay={d} duration={2.5 + i * 0.3} />
                            ))}
                        </div>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate={step2InView ? 'visible' : 'hidden'}
                        >
                            <motion.h3 variants={itemVariants} style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '1.1rem', fontWeight: 800,
                                color: '#f1f5f9', marginBottom: 10,
                            }}>
                                Verify Project &amp; Mint Credits
                            </motion.h3>
                            <motion.p variants={itemVariants} style={{
                                color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 16,
                            }}>
                                Upload ecological impact data. Smart contracts verify,
                                tokenise, and mint your verified reductions into
                                ERC-1155 carbon credits — each one a provably unique asset.
                            </motion.p>
                            <motion.div variants={itemVariants} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['IPFS Data Upload', 'Smart Contract Mint', 'ERC-1155 Token'].map(t => (
                                    <span key={t} style={{
                                        padding: '3px 10px', borderRadius: 999,
                                        background: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.25)',
                                        fontSize: '0.7rem', color: '#10b981', fontWeight: 600,
                                    }}>{t}</span>
                                ))}
                            </motion.div>
                        </motion.div>
                    </StepCard>

                    {/* ── Buyer (Right) ─────────────────────────────────── */}
                    <StepCard color="#3b82f6">
                        <StepBadge label="Buyer Route · Step 2b" color="#3b82f6" />

                        <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 20 }}>
                            <div
                                onMouseEnter={() => triggerPulse('2R')}
                                style={{
                                    width: 80, height: 80, borderRadius: 20,
                                    background: 'rgba(59,130,246,0.1)',
                                    border: '1.5px solid rgba(59,130,246,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 30px rgba(59,130,246,0.2)',
                                    overflow: 'visible', position: 'relative',
                                    cursor: 'pointer',
                                }}>
                                <ParallaxLayer multiplier={2}>
                                    <CubeIcon animate={step2InView} />
                                </ParallaxLayer>
                            </div>
                            {step2InView && [0, 0.5, 1.0].map((d, i) => (
                                <FloatingParticle key={i} color="#3b82f6" size={3 + i} delay={d} duration={2.8 + i * 0.2} />
                            ))}
                        </div>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate={step2InView ? 'visible' : 'hidden'}
                        >
                            <motion.h3 variants={itemVariants} style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '1.1rem', fontWeight: 800,
                                color: '#f1f5f9', marginBottom: 10,
                            }}>
                                Browse &amp; Acquire Credits
                            </motion.h3>
                            <motion.p variants={itemVariants} style={{
                                color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 16,
                            }}>
                                Access the global on-chain ledger of certified credits.
                                Filter by project type, geography, and vintage.
                                Purchase instantly with ETH — fully non-custodial.
                            </motion.p>
                            <motion.div variants={itemVariants} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['Global Ledger', 'ETH Purchase', 'Non-Custodial'].map(t => (
                                    <span key={t} style={{
                                        padding: '3px 10px', borderRadius: 999,
                                        background: 'rgba(59,130,246,0.1)',
                                        border: '1px solid rgba(59,130,246,0.28)',
                                        fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600,
                                    }}>{t}</span>
                                ))}
                            </motion.div>
                        </motion.div>
                    </StepCard>
                </div>

                {/* ══════════════════════════════════════════════════════
            STEP 3: CONVERGENCE & RETIREMENT — CENTER
            ══════════════════════════════════════════════════════ */}
                <div ref={step3Ref} style={{
                    display: 'flex', justifyContent: 'center',
                    position: 'relative', zIndex: 2,
                }}>
                    <StepCard color="#f59e0b" style={{ maxWidth: 560, width: '100%' }}>
                        <StepBadge label="Step 3 · Finality" color="#f59e0b" />

                        {/* Lock + block icon with converging light streams */}
                        <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 20 }}>
                            {/* Two converging light streams */}
                            {step3InView && (
                                <>
                                    {[{ from: -80, color: '#10b981' }, { from: 80, color: '#3b82f6' }].map(({ from, color }, i) => (
                                        <motion.div
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                top: '50%', left: '50%',
                                                width: 3, height: 50,
                                                borderRadius: 999,
                                                background: `linear-gradient(to bottom, ${color}, transparent)`,
                                                transformOrigin: 'top center',
                                            }}
                                            initial={{ x: from, y: -60, opacity: 0, rotate: i === 0 ? 45 : -45 }}
                                            animate={{ x: 0, y: -30, opacity: [0, 1, 0], rotate: 0 }}
                                            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                                        />
                                    ))}
                                </>
                            )}

                            <div
                                onMouseEnter={() => triggerPulse('3')}
                                style={{
                                    width: 90, height: 90, borderRadius: 22,
                                    background: 'rgba(245,158,11,0.1)',
                                    border: '1.5px solid rgba(245,158,11,0.45)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: locked ? '0 0 50px rgba(245,158,11,0.35)' : '0 0 20px rgba(245,158,11,0.1)',
                                    transition: 'box-shadow 0.5s ease',
                                    position: 'relative', overflow: 'visible',
                                    cursor: 'pointer',
                                }}>
                                <ParallaxLayer multiplier={2}>
                                    <LockBlockIcon animate={step3InView} locked={locked} />
                                    <PulseRipple trigger={locked} color="#f59e0b" />
                                    <ParticleExplosion trigger={locked} color1="#10b981" color2="#3b82f6" count={50} />
                                </ParallaxLayer>
                            </div>

                            {/* Extra ambient particles */}
                            {step3InView && [0, 0.3, 0.6, 0.9, 1.2].map((d, i) => (
                                <FloatingParticle key={i}
                                    color={i % 2 === 0 ? '#f59e0b' : '#10b981'}
                                    size={2 + (i % 3)}
                                    delay={d} duration={2 + i * 0.2}
                                />
                            ))}
                        </div>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate={step3InView ? 'visible' : 'hidden'}
                        >
                            <motion.h3 variants={itemVariants} style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: '1.25rem', fontWeight: 800,
                                color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.01em',
                            }}>
                                3. Trade Finality &amp; Retirement
                            </motion.h3>
                            <motion.p variants={itemVariants} style={{
                                color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 16,
                            }}>
                                Credits are <strong style={{ color: '#f59e0b' }}>burned on-chain</strong> to
                                permanently offset emissions. The retirement event is immutably recorded —
                                a cryptographic proof of impact that can never be double-counted or reversed.
                            </motion.p>
                            <motion.div variants={itemVariants} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['Token Burn', 'Immutable Record', 'Proof of Impact'].map(t => (
                                    <span key={t} style={{
                                        padding: '3px 10px', borderRadius: 999,
                                        background: 'rgba(245,158,11,0.1)',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600,
                                    }}>{t}</span>
                                ))}
                            </motion.div>

                            {/* Final CTA */}
                            <motion.div variants={itemVariants} style={{ marginTop: 22 }}>
                                <motion.button
                                    whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(16,185,129,0.45)' }}
                                    whileTap={{ scale: 0.96 }}
                                    style={{
                                        padding: '12px 28px', borderRadius: 12,
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        border: 'none', cursor: 'pointer', color: '#fff',
                                        fontWeight: 700, fontSize: '0.9rem',
                                        boxShadow: '0 0 24px rgba(16,185,129,0.3)',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                >
                                    <span>Start Offsetting Now</span>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    </StepCard>
                </div>

            </div>

            {/* CSS keyframes for the pulse dot in the header */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
        </section>
    );
}
