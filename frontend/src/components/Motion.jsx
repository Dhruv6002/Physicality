import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export function Reveal({ children, delay = 0, className = "", y = 28 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MaskedLines({ lines, className = "", lineClassName = "", as: Tag = "h1" }) {
  const MotionTag = motion[Tag] || motion.h1;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.14, delayChildren: 0.25 } } }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-1">
          <motion.span
            className={`block ${lineClassName}`}
            variants={{ hidden: { y: "115%" }, visible: { y: "0%" } }}
            transition={{ duration: 1.05, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

export function SectionHeading({ index, title, className = "" }) {
  return (
    <Reveal className={className}>
      <div className="flex items-baseline gap-4 border-t border-ink pt-4">
        <span className="font-mono-press text-xs uppercase tracking-[0.2em] text-terra">{index}</span>
        <h2 className="font-serif-press text-3xl md:text-4xl tracking-tight leading-[1.1] text-ink">{title}</h2>
      </div>
    </Reveal>
  );
}

export function RegistrationMarks({ className = "" }) {
  const mark = "absolute font-mono-press text-xs text-smoke select-none";
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <span className={`${mark} -top-2 -left-2`}>+</span>
      <span className={`${mark} -top-2 -right-2`}>+</span>
      <span className={`${mark} -bottom-2 -left-2`}>+</span>
      <span className={`${mark} -bottom-2 -right-2`}>+</span>
    </div>
  );
}
