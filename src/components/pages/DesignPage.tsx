import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Copy, Download, Expand, Type } from 'lucide-react';
import Logo from '@/components/Logo';
import {
  Artboard,
  type ArtboardBackground,
  type ArtboardPadding,
  type ArtboardRatio,
} from '@/design/Artboard';
import {
  DEFAULT_STORY,
  DESIGN_STORIES,
  findStory,
  storiesBySection,
} from '@/design/catalog';
import { artboardFilename, captureArtboard, copyPng, downloadPng } from '@/design/exportArtboard';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'sonner';

const BACKGROUNDS: ArtboardBackground[] = ['white', 'gray', 'dotted', 'dark'];
const PADDINGS: ArtboardPadding[] = ['sm', 'md', 'lg'];
const RATIOS: ArtboardRatio[] = ['1x1', '16x9', '9x16'];
const RATIO_LABEL: Record<ArtboardRatio, string> = {
  '1x1': '1:1',
  '16x9': '16:9',
  '9x16': '9:16',
};

function parseBackground(value: string | null): ArtboardBackground {
  return BACKGROUNDS.includes(value as ArtboardBackground) ? (value as ArtboardBackground) : 'white';
}

function parsePadding(value: string | null): ArtboardPadding {
  return PADDINGS.includes(value as ArtboardPadding) ? (value as ArtboardPadding) : 'md';
}

function parseRatio(value: string | null): ArtboardRatio {
  return RATIOS.includes(value as ArtboardRatio) ? (value as ArtboardRatio) : '16x9';
}

export function DesignPage() {
  const { section, storyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const artboardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'png' | 'copy' | null>(null);
  const [copied, setCopied] = useState(false);

  const story = findStory(section, storyId);
  const groups = useMemo(() => storiesBySection(), []);
  const solo = searchParams.get('solo') === '1';
  const background = parseBackground(searchParams.get('bg'));
  const chrome = searchParams.get('caption') !== '0';
  const padding = parsePadding(searchParams.get('pad'));
  const ratio = parseRatio(searchParams.get('ratio'));

  if (!section || !storyId || !story) {
    return (
      <Navigate
        to={`/design/${DEFAULT_STORY.section}/${DEFAULT_STORY.id}`}
        replace
      />
    );
  }

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  };

  const storyHref = (nextSection: string, nextId: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (background !== 'white') params.set('bg', background);
    if (!chrome) params.set('caption', '0');
    if (padding !== 'md') params.set('pad', padding);
    if (ratio !== '16x9') params.set('ratio', ratio);
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    }
    const query = params.toString();
    return `/design/${nextSection}/${nextId}${query ? `?${query}` : ''}`;
  };

  const exportImage = async (mode: 'png' | 'copy') => {
    const node = artboardRef.current;
    if (!node) return;
    setExporting(mode);
    try {
      const dataUrl = await captureArtboard(node);
      const filename = artboardFilename(story.section, story.id);
      if (mode === 'png') {
        downloadPng(dataUrl, filename);
        toast.success('Downloaded PNG');
      } else {
        await copyPng(dataUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        toast.success('Copied to clipboard');
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not export this artboard');
    } finally {
      setExporting(null);
    }
  };

  const Live = story.Live;

  if (solo) {
    const exitSolo = storyHref(story.section, story.id);
    return (
      <TooltipProvider>
        <div
          className={cn(
            'relative flex min-h-screen items-center justify-center p-10',
            background === 'dark' ? 'bg-neutral-900' : 'bg-white'
          )}
        >
          <Link
            to={exitSolo}
            className="absolute left-4 top-4 text-xs text-neutral-400 hover:text-neutral-700"
          >
            Exit solo
          </Link>
          <Artboard
            ref={artboardRef}
            title={story.title}
            description={story.description}
            background={background}
            padding={padding}
            ratio={ratio}
            chrome={chrome}
          >
            <story.Story />
          </Artboard>
        </div>
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-white text-neutral-900">
        <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
            <Logo size={18} color="#6b7280" alt="Corals" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Design</p>
              <p className="text-[11px] text-neutral-400">{DESIGN_STORIES.length} stories</p>
            </div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {groups.map((group) => (
              <div key={group.section} className="mb-3">
                <p className="px-2 pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                  {group.label}
                </p>
                <div className="flex flex-col">
                  {group.stories.map((item) => {
                    const active = item.section === story.section && item.id === story.id;
                    return (
                      <Link
                        key={`${item.section}-${item.id}`}
                        to={storyHref(item.section, item.id)}
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[13px] leading-5',
                          active
                            ? 'bg-neutral-100 font-medium text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        )}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-neutral-200 px-4 py-3">
            <Link to="/" className="text-xs text-neutral-400 hover:text-neutral-700">
              Back to Corals
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold tracking-tight">{story.title}</h1>
              <p className="truncate text-xs text-neutral-500">{story.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {BACKGROUNDS.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={background === item ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs capitalize"
                  onClick={() => setParam('bg', item === 'white' ? null : item)}
                >
                  {item}
                </Button>
              ))}
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              {RATIOS.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={ratio === item ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setParam('ratio', item === '16x9' ? null : item)}
                >
                  {RATIO_LABEL[item]}
                </Button>
              ))}
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              {PADDINGS.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={padding === item ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs uppercase"
                  onClick={() => setParam('pad', item === 'md' ? null : item)}
                >
                  {item}
                </Button>
              ))}
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              <Button
                type="button"
                size="sm"
                variant={chrome ? 'secondary' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setParam('caption', chrome ? '0' : null)}
              >
                <Type className="mr-1 h-3.5 w-3.5" />
                Caption
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                <Link to={storyHref(story.section, story.id, { solo: '1' })}>
                  <Expand className="mr-1 h-3.5 w-3.5" />
                  Solo
                </Link>
              </Button>
              {Live && (
                <>
                  <span className="mx-1 h-4 w-px bg-neutral-200" />
                  <Live />
                </>
              )}
              <span className="mx-1 h-4 w-px bg-neutral-200" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={exporting !== null}
                onClick={() => exportImage('copy')}
              >
                {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={exporting !== null}
                onClick={() => exportImage('png')}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                PNG
              </Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-neutral-100 p-8">
            <Artboard
              ref={artboardRef}
              title={story.title}
              description={story.description}
              background={background}
              padding={padding}
              ratio={ratio}
              chrome={chrome}
            >
              <story.Story />
            </Artboard>
          </div>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
