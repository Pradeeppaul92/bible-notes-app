import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle,
} from 'docx';
import { getFreeNotes, getAllVerseNotes, getHighlightList, getPrayerBlocks, getProclamations } from './storage';

function strip(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' } },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Calibri', ...opts })],
    spacing: { after: 80 },
  });
}

function italicPara(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, italics: true, font: 'Calibri', color: '555555' })],
    spacing: { after: 60 },
  });
}

function label(text) {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), size: 16, bold: true, font: 'Calibri', color: '888888', characterSpacing: 40 })],
    spacing: { before: 160, after: 40 },
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
    spacing: { before: 120, after: 120 },
  });
}

export async function exportNotes() {
  const freeNotes   = getFreeNotes();
  const verseNotes  = getAllVerseNotes();
  const highlights  = getHighlightList();
  const prayers     = getPrayerBlocks();
  const proclamations = getProclamations();

  const sections = [];

  // ── Cover title ──────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'Sefer — My Notes', size: 56, bold: true, font: 'Calibri', color: '1A1007' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Exported ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        size: 20, font: 'Calibri', color: '888888',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    divider(),
  );

  // ── Personal Notes ───────────────────────────────────
  if (freeNotes.length > 0) {
    sections.push(heading1('Personal Notes'));
    freeNotes.forEach((note) => {
      const noteBody = strip(note.body || note.html || '');
      sections.push(
        heading2(note.heading || note.title || 'Untitled'),
        ...noteBody.split('\n').filter(Boolean).map((line) => body(line)),
        divider(),
      );
    });
  }

  // ── Verse Notes ──────────────────────────────────────
  if (verseNotes.length > 0) {
    sections.push(heading1('Verse Notes'));
    verseNotes.forEach((note) => {
      sections.push(label(note.verseRef || note.ref || ''));
      if (note.verseText) sections.push(italicPara(`"${strip(note.verseText)}"`));
      const noteText = (note.notes || []).map((n) => n.text).join('\n\n');
      sections.push(
        ...noteText.split('\n').filter(Boolean).map((line) => body(line)),
        divider(),
      );
    });
  }

  // ── Highlights ───────────────────────────────────────
  if (highlights.length > 0) {
    sections.push(heading1('Highlighted Verses'));
    highlights.forEach((hl) => {
      sections.push(label(hl.ref || hl.verseId));
      if (hl.text) sections.push(italicPara(`"${hl.text}"`));
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `Highlight colour: ${hl.color || ''}`, size: 18, font: 'Calibri', color: '888888' })],
          spacing: { after: 80 },
        }),
        divider(),
      );
    });
  }

  // ── Prayer Points ────────────────────────────────────
  if (prayers.length > 0) {
    sections.push(heading1('Prayer Points'));
    prayers.forEach((p) => {
      const pBody = strip(p.html || p.body || '');
      sections.push(
        heading2(p.title || 'Prayer'),
        ...pBody.split('\n').filter(Boolean).map((line) => body(line)),
        divider(),
      );
    });
  }

  // ── Proclamations ────────────────────────────────────
  if (proclamations.length > 0) {
    sections.push(heading1('Daily Proclamations'));
    proclamations.forEach((p) => {
      sections.push(
        label(p.ref),
        italicPara(`"${p.text}"`),
        divider(),
      );
    });
  }

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          run: { size: 36, bold: true, font: 'Calibri', color: '1A1007' },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          run: { size: 26, bold: true, font: 'Calibri', color: '3A2008' },
        },
      ],
    },
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}
