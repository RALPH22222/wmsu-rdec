import React, { useMemo, useRef, useEffect, forwardRef } from 'react';
import gsap from 'gsap';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className={`absolute top-1/2 left-1/2 rounded-xl border border-white bg-black [transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden] ${
          customClass ?? ''
        } ${className ?? ''}`.trim()}
      />
    );
  }
);
Card.displayName = 'Card';

const calculateCardPosition = (
  index: number,
  cardDistance: number,
  verticalDistance: number,
  total: number
) => ({
  x: index * cardDistance,
  y: -index * verticalDistance,
  z: -index * cardDistance * 1.5,
  zIndex: total - index,
});

const applyCardTransforms = (
  el: HTMLElement,
  pos: { x: number; y: number; z: number; zIndex: number },
  skewY: number
) => {
  gsap.set(el, {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skewY,
    transformOrigin: 'center center',
    zIndex: pos.zIndex,
    force3D: true,
  });
};

export interface CardStackProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  skewAmount?: number;
  easing?: 'elastic' | 'power';
  children: React.ReactNode;
}

export const CardStack: React.FC<CardStackProps> = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = 'elastic',
  children,
}) => {
  const easeConfig = useMemo(
    () =>
      easing === 'elastic'
        ? {
            ease: 'elastic.out(0.6, 0.9)',
            durDrop: 2,
            durMove: 2,
            durReturn: 2,
            promoteOverlap: 0.9,
            returnDelay: 0.05,
          }
        : {
            ease: 'power1.inOut',
            durDrop: 0.8,
            durMove: 0.8,
            durReturn: 0.8,
            promoteOverlap: 0.45,
            returnDelay: 0.2,
          },
    [easing]
  );

  const cardElements = useMemo(() => React.Children.toArray(children), [children]);
  const cardRefs = useMemo(
    () => cardElements.map(() => React.createRef<HTMLDivElement>()),
    [cardElements]
  );
  const cardOrderRef = useRef<number[]>(
    Array.from({ length: cardElements.length }, (_, i) => i)
  );
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const total = cardRefs.length;
    if (total === 0) return;

    // Reset card order if length changed
    if (cardOrderRef.current.length !== total) {
      cardOrderRef.current = Array.from({ length: total }, (_, i) => i);
    }

    // Set initial 3D positions with skew
    cardRefs.forEach((ref, idx) => {
      if (ref.current) {
        applyCardTransforms(
          ref.current,
          calculateCardPosition(idx, cardDistance, verticalDistance, total),
          skewAmount
        );
      }
    });

    const cycleCards = () => {
      if (cardOrderRef.current.length < 2) return;
      const [topIndex, ...remainingIndices] = cardOrderRef.current;
      const topEl = cardRefs[topIndex]?.current;
      if (!topEl) return;

      const tl = gsap.timeline();
      timelineRef.current = tl;

      // 1. Drop top card downwards
      tl.to(topEl, {
        y: '+=500',
        duration: easeConfig.durDrop,
        ease: easeConfig.ease,
      });
      tl.addLabel('promote', `-=${easeConfig.durDrop * easeConfig.promoteOverlap}`);

      // 2. Promote other cards forward
      remainingIndices.forEach((cardIdx, newPos) => {
        const el = cardRefs[cardIdx]?.current;
        if (!el) return;
        const pos = calculateCardPosition(newPos, cardDistance, verticalDistance, total);
        tl.set(el, { zIndex: pos.zIndex }, 'promote');
        tl.to(
          el,
          {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            duration: easeConfig.durMove,
            ease: easeConfig.ease,
          },
          `promote+=${newPos * 0.15}`
        );
      });

      // 3. Return dropped card to the rear of the stack
      const backPos = calculateCardPosition(
        total - 1,
        cardDistance,
        verticalDistance,
        total
      );
      tl.addLabel('return', `promote+=${easeConfig.durMove * easeConfig.returnDelay}`);
      tl.call(
        () => {
          gsap.set(topEl, { zIndex: backPos.zIndex });
        },
        undefined,
        'return'
      );
      tl.to(
        topEl,
        {
          x: backPos.x,
          y: backPos.y,
          z: backPos.z,
          duration: easeConfig.durReturn,
          ease: easeConfig.ease,
        },
        'return'
      );
      tl.call(() => {
        cardOrderRef.current = [...remainingIndices, topIndex];
      });
    };

    // Cycle cards immediately on mount (just like the original website bundle)
    cycleCards();
    intervalRef.current = window.setInterval(cycleCards, delay);

    if (pauseOnHover) {
      const container = containerRef.current;
      if (!container) return () => {};

      const onEnter = () => {
        timelineRef.current?.pause();
        if (intervalRef.current != null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      const onLeave = () => {
        timelineRef.current?.play();
        intervalRef.current = window.setInterval(cycleCards, delay);
      };

      container.addEventListener('mouseenter', onEnter);
      container.addEventListener('mouseleave', onLeave);

      return () => {
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
        if (intervalRef.current != null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    cardDistance,
    verticalDistance,
    delay,
    pauseOnHover,
    skewAmount,
    easeConfig,
    cardRefs,
    cardElements,
  ]);

  const renderedCards = cardElements.map((card, idx) => {
    if (React.isValidElement<CardProps>(card)) {
      return React.cloneElement(card, {
        key: idx,
        ref: cardRefs[idx],
        style: {
          width,
          height,
          ...(card.props.style ?? {}),
        },
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
          card.props.onClick?.(e);
          onCardClick?.(idx);
        },
      });
    }
    return card;
  });

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 right-0 transform translate-x-[5%] translate-y-[20%] origin-bottom-right perspective-[900px] overflow-visible max-[768px]:translate-x-[25%] max-[768px]:translate-y-[25%] max-[768px]:scale-[0.75] max-[480px]:translate-x-[25%] max-[480px]:translate-y-[25%] max-[480px]:scale-[0.55]"
      style={{ width, height }}
    >
      {renderedCards}
    </div>
  );
};
