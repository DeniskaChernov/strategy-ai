import React, {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";

type TFn = (key: string, fallback?: string) => string;

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const placeholderImage = (text = "Image") =>
  `https://placehold.co/600x400/1a1a1a/ffffff?text=${encodeURIComponent(text)}`;

type StaticImageData = string;

export interface LandingCarouselImageSet {
  step1img2: StaticImageData;
  step2img1: StaticImageData;
  step2img2: StaticImageData;
  step3img: StaticImageData;
  step4img: StaticImageData;
  alt: string;
}

interface StepImageProps {
  src: StaticImageData;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
}

interface StepDef {
  id: string;
  nameKey: string;
  nameFb: string;
  titleKey: string;
  titleFb: string;
  descKey: string;
  descFb: string;
}

const TOTAL_STEPS = 4;

const STEP_DEFS: readonly StepDef[] = [
  {
    id: "1",
    nameKey: "ref_fc_s1_name",
    nameFb: "Шаг 1",
    titleKey: "ref_how1_t",
    titleFb: "Карта стратегии",
    descKey: "ref_how1_d",
    descFb: "Цели, инициативы, KPI и риски как узлы и связи.",
  },
  {
    id: "2",
    nameKey: "ref_fc_s2_name",
    nameFb: "Шаг 2",
    titleKey: "ref_how2_t",
    titleFb: "Сценарии",
    descKey: "ref_how2_d",
    descFb: "Ветки сценариев и последствия на одной карте — без лишнего шума.",
  },
  {
    id: "3",
    nameKey: "ref_fc_s3_name",
    nameFb: "Шаг 3",
    titleKey: "ref_how3_t",
    titleFb: "Спросите AI",
    descKey: "ref_how3_d",
    descFb: "Вопросы по пробелам, рискам и приоритетам в контексте карты.",
  },
  {
    id: "4",
    nameKey: "ref_fc_s4_name",
    nameFb: "Шаг 4",
    titleKey: "ref_how4_t",
    titleFb: "Исполнение",
    descKey: "ref_how4_d",
    descFb: "Таймлайн, прогресс и командная работа.",
  },
];

const ANIMATION_PRESETS = {
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 300, damping: 25, mass: 0.5 },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { type: "spring" as const, stiffness: 300, damping: 25, mass: 0.5 },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { type: "spring" as const, stiffness: 300, damping: 25, mass: 0.5 },
  },
} as const;

type AnimationPreset = keyof typeof ANIMATION_PRESETS;

interface AnimatedStepImageProps extends StepImageProps {
  preset?: AnimationPreset;
  delay?: number;
  onAnimationComplete?: () => void;
}

function useNumberCycler(totalSteps: number = TOTAL_STEPS, interval: number = 5000) {
  const [currentNumber, setCurrentNumber] = useState(0);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setCurrentNumber((prev) => (prev + 1) % totalSteps);
    }, interval);
    return () => clearTimeout(timerId);
  }, [currentNumber, totalSteps, interval]);

  const setStep = useCallback(
    (stepIndex: number) => {
      setCurrentNumber(stepIndex % totalSteps);
    },
    [totalSteps],
  );

  return { currentNumber, setStep };
}

function IconCheck({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      className={cn("land-fc-icon-check", className)}
      {...props}
    >
      <path d="m229.66 77.66-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69 218.34 66.34a8 8 0 0 1 11.32 11.32Z" />
    </svg>
  );
}

const stepVariants: Variants = {
  inactive: { scale: 0.9, opacity: 0.7 },
  active: { scale: 1, opacity: 1 },
};

const StepImage = forwardRef<HTMLImageElement, StepImageProps>(
  ({ src, alt, className, style, ...props }, ref) => {
    return (
      <img
        ref={ref}
        alt={alt}
        className={className}
        src={src}
        style={{
          maxWidth: "unset",
          ...style,
        }}
        onError={(e) => {
          e.currentTarget.src = placeholderImage(alt);
        }}
        {...props}
      />
    );
  },
);
StepImage.displayName = "StepImage";

const MotionStepImage = motion(StepImage);

const AnimatedStepImage = ({
  preset = "fadeInScale",
  delay = 0,
  ...props
}: AnimatedStepImageProps) => {
  const presetConfig = ANIMATION_PRESETS[preset];
  return (
    <MotionStepImage
      {...props}
      {...presetConfig}
      transition={{ ...presetConfig.transition, delay }}
    />
  );
};

function FeatureCard({
  children,
  step,
  t,
}: {
  children: React.ReactNode;
  step: number;
  t: TFn;
}) {
  const s = STEP_DEFS[step]!;
  return (
    <div className="land-fc-spot-wrap">
      <div className="land-fc-card-inner">
        <div className="land-fc-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="land-fc-text-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="land-fc-kicker"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {t(s.nameKey, s.nameFb)}
              </motion.div>
              <motion.h2
                className="land-fc-title"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {t(s.titleKey, s.titleFb)}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="land-fc-desc">{t(s.descKey, s.descFb)}</p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
          {children}
        </div>
      </div>
    </div>
  );
}

function StepsNav({
  stepItems,
  current,
  onChange,
  t,
}: {
  stepItems: readonly StepDef[];
  current: number;
  onChange: (index: number) => void;
  t: TFn;
}) {
  return (
    <nav aria-label={t("ref_fc_nav_aria", "Прогресс по шагам")} className="land-fc-nav">
      <ol className="land-fc-nav-list" role="list">
        {stepItems.map((step, stepIdx) => {
          const isCompleted = current > stepIdx;
          const isCurrent = current === stepIdx;
          return (
            <motion.li
              key={step.id}
              initial="inactive"
              animate={isCurrent ? "active" : "inactive"}
              variants={stepVariants}
              transition={{ duration: 0.3 }}
              className="land-fc-nav-item"
            >
              <button
                type="button"
                className={cn(
                  "land-fc-step-btn",
                  isCurrent ? "land-fc-step-btn--on" : "land-fc-step-btn--off",
                )}
                onClick={() => onChange(stepIdx)}
              >
                <span
                  className={cn(
                    "land-fc-step-badge",
                    isCompleted
                      ? "land-fc-step-badge--done"
                      : isCurrent
                        ? "land-fc-step-badge--current"
                        : "land-fc-step-badge--idle",
                  )}
                >
                  {isCompleted ? (
                    <IconCheck />
                  ) : (
                    <span>{stepIdx + 1}</span>
                  )}
                </span>
                <span className="land-fc-step-label">{t(step.nameKey, step.nameFb)}</span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}

const defaultClasses = {
  img: "land-fc-img",
  step1img2: "land-fc-img-pos land-fc-img-s1b",
  step2img1: "land-fc-img-pos land-fc-img-s2a",
  step2img2: "land-fc-img-pos land-fc-img-s2b",
  step3img: "land-fc-img-pos land-fc-img-s3",
  step4img: "land-fc-img-pos land-fc-img-s4",
} as const;

export function defaultLandingCarouselImages(alt: string): LandingCarouselImageSet {
  return {
    step1img2:
      "https://placehold.co/640x360/15121f/15121f",
    step2img1: `https://placehold.co/720x400/1e1630/c4b5fd?text=${encodeURIComponent("Сценарии")}`,
    step2img2: `https://placehold.co/720x400/1e1630/c4b5fd?text=${encodeURIComponent("Сценарии")}`,
    step3img: `https://placehold.co/640x360/1e1630/fde68a?text=${encodeURIComponent("AI")}`,
    step4img: `https://placehold.co/640x360/14201e/7dd3fc?text=${encodeURIComponent("Gantt")}`,
    alt,
  };
}

export interface LandingFeatureCarouselProps {
  t: TFn;
  image?: Partial<LandingCarouselImageSet>;
  step1img2Class?: string;
  step2img1Class?: string;
  step2img2Class?: string;
  step3imgClass?: string;
  step4imgClass?: string;
}

export function LandingFeatureCarousel({
  t,
  image: imagePartial,
  step1img2Class = defaultClasses.step1img2,
  step2img1Class = defaultClasses.step2img1,
  step2img2Class = defaultClasses.step2img2,
  step3imgClass = defaultClasses.step3img,
  step4imgClass = defaultClasses.step4img,
}: LandingFeatureCarouselProps) {
  const alt = imagePartial?.alt ?? t("ref_fc_img_alt", "Интерфейс Strategy AI");
  const base = defaultLandingCarouselImages(alt);
  const image: LandingCarouselImageSet = { ...base, ...imagePartial, alt };

  const { currentNumber: step, setStep } = useNumberCycler();
  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="land-fc-viz-root land-fc-viz-root--single">
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step1img2Class)}
              src={image.step1img2}
              preset="fadeInScale"
            />
          </div>
        );
      case 1:
        return (
          <div className="land-fc-viz-root land-fc-viz-root--single">
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step2img1Class)}
              src={image.step2img1}
              preset="fadeInScale"
            />
          </div>
        );
      case 2:
        return (
          <div className="land-fc-viz-root land-fc-viz-root--single">
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step3imgClass)}
              src={image.step3img}
              preset="fadeInScale"
            />
          </div>
        );
      case 3:
        return (
          <div className="land-fc-viz-root land-fc-viz-root--single">
            <AnimatedStepImage
              alt={image.alt}
              className={cn(defaultClasses.img, step4imgClass)}
              src={image.step4img}
              preset="fadeInScale"
            />
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <div className="land-fc-root">
      <FeatureCard step={step} t={t}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            {...ANIMATION_PRESETS.fadeInScale}
            className="land-fc-viz-layer"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </FeatureCard>
      <motion.div
        className="land-fc-nav-wrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <StepsNav current={step} onChange={setStep} stepItems={STEP_DEFS} t={t} />
      </motion.div>
    </div>
  );
}
