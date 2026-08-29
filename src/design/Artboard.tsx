import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

export type ArtboardBackground = 'white' | 'gray' | 'dotted' | 'dark';
export type ArtboardPadding = 'sm' | 'md' | 'lg';
export type ArtboardRatio = '1x1' | '16x9' | '9x16';

const PADDING: Record<ArtboardPadding, string> = {
  sm: 'p-5',
  md: 'p-8',
  lg: 'p-12',
};

const BACKGROUNDS: Record<ArtboardBackground, string> = {
  white: 'bg-white text-neutral-900',
  gray: 'bg-neutral-100 text-neutral-900',
  dotted: 'bg-neutral-50 text-neutral-900',
  dark: 'dark bg-neutral-950 text-neutral-50',
};

const RATIO: Record<ArtboardRatio, string> = {
  '1x1': 'aspect-square w-[min(100%,40rem)] max-h-full',
  '16x9': 'aspect-video w-[min(100%,56rem)] max-h-full',
  '9x16': 'aspect-[9/16] h-[min(36rem,calc(100vh-11rem))] w-auto max-w-full',
};

function FitStage({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const measure = () => {
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      if (fw < 8 || fh < 8) return;
      const cw = Math.max(content.scrollWidth, content.offsetWidth, 1);
      const ch = Math.max(content.scrollHeight, content.offsetHeight, 1);
      const next = Math.min(1, fw / cw, fh / ch);
      setScale((prev) => (Math.abs(prev - next) < 0.008 ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(content);
    const images = Array.from(content.querySelectorAll('img'));
    images.forEach((image) => {
      if (!image.complete) image.addEventListener('load', measure, { once: true });
    });
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden"
    >
      <div
        ref={contentRef}
        className="absolute left-1/2 w-full min-w-0"
        style={{
          top: scale < 0.999 ? 0 : '50%',
          transform:
            scale < 0.999
              ? `translateX(-50%) scale(${scale})`
              : `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: scale < 0.999 ? 'top center' : 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface ArtboardProps {
  title: string;
  description: string;
  background: ArtboardBackground;
  padding: ArtboardPadding;
  ratio: ArtboardRatio;
  chrome: boolean;
  children: ReactNode;
}

export const Artboard = forwardRef<HTMLDivElement, ArtboardProps>(function Artboard(
  { title, description, background, padding, ratio, chrome, children },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(15,15,15,0.12)]',
        RATIO[ratio],
        BACKGROUNDS[background]
      )}
    >
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden',
          background === 'dotted' && 'bg-[radial-gradient(#d4d4d4_1px,transparent_1px)] bg-[size:16px_16px]'
        )}
      >
        {chrome && (
          <div className="flex shrink-0 items-start justify-between gap-6 px-8 pt-7">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                Corals
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            </div>
            <Logo size={28} color={background === 'dark' ? '#a3a3a3' : '#6b7280'} alt="Corals" />
          </div>
        )}
        <div className={cn('min-h-0 min-w-0 flex-1 overflow-hidden', PADDING[padding])}>
          <FitStage>{children}</FitStage>
        </div>
      </div>
    </div>
  );
});
