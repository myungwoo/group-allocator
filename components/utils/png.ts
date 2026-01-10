'use client';

import html2canvas from 'html2canvas';

export async function generatePaddedPngBlob(node: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
  const pad = 32;
  const padded = document.createElement('canvas');
  padded.width = canvas.width + pad * 2;
  padded.height = canvas.height + pad * 2;
  const ctx = padded.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, padded.width, padded.height);
  ctx.drawImage(canvas, pad, pad);
  const blob = await new Promise<Blob | null>((resolve) => padded.toBlob((b) => resolve(b), 'image/png'));
  return blob;
}

