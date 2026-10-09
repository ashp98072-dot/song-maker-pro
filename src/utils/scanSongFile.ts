type PositionedText = { str: string; transform: number[]; width: number; height: number };

// Keep chord positions above lyrics instead of flattening each PDF page into a sentence.
export function pdfTextToLines(items: PositionedText[]): string {
  const rows: { y: number; items: PositionedText[] }[] = [];
  for (const item of items.filter(item => item.str.trim())) {
    const y = item.transform[5];
    const row = rows.find(row => Math.abs(row.y - y) < 3);
    if (row) row.items.push(item);
    else rows.push({ y, items: [item] });
  }
  const left = Math.min(...items.filter(item => item.str.trim()).map(item => item.transform[4]));
  const widths = items.filter(item => item.str.trim().length > 3 && item.width > 0)
    .map(item => item.width / item.str.length).sort((a, b) => a - b);
  const charWidth = widths[Math.floor(widths.length / 2)] || 6;
  return rows.sort((a, b) => b.y - a.y).map(row => {
    let line = '';
    for (const item of row.items.sort((a, b) => a.transform[4] - b.transform[4])) {
      const column = Math.max(0, Math.round((item.transform[4] - left) / charWidth));
      line += ' '.repeat(Math.max(line.length ? 1 : 0, column - line.length)) + item.str;
    }
    return line.trimEnd();
  }).join('\n');
}

export async function scanSongFile(file: File): Promise<string> {
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | undefined;
  const recognize = async (input: File | HTMLCanvasElement) => {
    if (!worker) {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('spa+eng');
      await worker.setParameters({ preserve_interword_spaces: '1' });
    }
    return (await worker.recognize(input)).data.text;
  };
  try {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return await recognize(file);
    const pdfjs = await import('pdfjs-dist');
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 20) throw new Error('El PDF tiene más de 20 páginas. Importa un archivo más corto.');
      const pages: string[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        try {
          const content = await page.getTextContent();
          const items = content.items.filter((item): item is typeof item & PositionedText => 'str' in item);
          let text = pdfTextToLines(items);
          if (!text.trim()) {
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(2, 2400 / Math.max(base.width, base.height)) });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            try {
              await page.render({ canvas, viewport }).promise;
              text = await recognize(canvas);
            } finally {
              canvas.width = canvas.height = 0;
            }
          }
          pages.push(text);
        } finally {
          page.cleanup();
        }
      }
      return pages.join('\n\n');
    } finally {
      await task.destroy();
    }
  } finally {
    await worker?.terminate();
  }
}
