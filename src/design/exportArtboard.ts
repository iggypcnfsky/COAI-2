export async function captureArtboard(node: HTMLElement): Promise<string> {
  await document.fonts.ready;
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            })
    )
  );
  const { toPng } = await import('html-to-image');
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
  });
}

export function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function copyPng(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function artboardFilename(section: string, storyId: string) {
  return `corals-${section}-${storyId}.png`;
}
