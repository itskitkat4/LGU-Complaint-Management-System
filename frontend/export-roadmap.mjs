import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const source = new URL('../docs/CLEANUP-ROADMAP.md', import.meta.url);
const output = new URL('../docs/CLEANUP-ROADMAP.pdf', import.meta.url);
const markdown = fs.readFileSync(source, 'utf8');
const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
let y = margin;

function printable(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*]/g, '')
    .replace(/[→├─└]/g, '>')
    .replace(/[–—]/g, '-')
    .replace(/☐/g, '[ ]')
    .replace(/[^\x00-\x7F]/g, '');
}

for (const rawLine of markdown.split(/\r?\n/)) {
  let line = printable(rawLine.trimEnd());
  if (line.startsWith('```')) continue;
  if (line === 'text') continue;
  if (!line) {
    y += 5;
    continue;
  }

  const heading = line.match(/^(#{1,3})\s+(.*)$/);
  if (heading) line = heading[2];
  const size = heading ? (heading[1].length === 1 ? 18 : heading[1].length === 2 ? 14 : 11) : 9;
  const bold = Boolean(heading) || line.startsWith('|') || line.startsWith('**');

  if (/^\|[-| :]+\|?$/.test(line)) continue;
  if (line.startsWith('|')) {
    line = line.replace(/^\|\s*/, '').replace(/\s*\|\s*/g, '  |  ').replace(/\s*\|$/, '');
  }

  const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2);
  const blockHeight = wrapped.length * (size + 3) + (heading ? 6 : 2);
  if (y + blockHeight > pageHeight - 52) {
    pdf.addPage();
    y = margin;
  }

  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(heading ? 25 : 45, heading ? 65 : 45, heading ? 110 : 45);
  pdf.text(wrapped, margin, y);
  y += blockHeight;
}

const pages = pdf.getNumberOfPages();
for (let page = 1; page <= pages; page += 1) {
  pdf.setPage(page);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(110);
  pdf.text('BantaySerbisyo Cleanup Roadmap | reviewed 23 Nov 2026', margin, pageHeight - 24);
  pdf.text(`${page}/${pages}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
}

fs.writeFileSync(fileURLToPath(output), Buffer.from(pdf.output('arraybuffer')));
console.log(`Wrote ${pages} page PDF: ${fileURLToPath(output)}`);
