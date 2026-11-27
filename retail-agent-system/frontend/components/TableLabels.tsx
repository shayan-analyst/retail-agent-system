'use client';

import { useEffect } from 'react';

/**
 * Presentation only: copies each column header's text onto its cells as a
 * `data-label`, so the CSS in globals.css can show tables as stacked cards on
 * phones. Touches no data, no network, no state.
 */
export default function TableLabels() {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll('main table').forEach((table) => {
        const heads = Array.from(table.querySelectorAll('thead th')).map((th) => (th.textContent || '').trim());
        if (!heads.length) return;
        table.querySelectorAll('tbody tr').forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            const el = td as HTMLElement;
            const text = el.getAttribute('colspan') ? '' : heads[i] || '';
            if (el.dataset.label !== text) el.dataset.label = text;
          });
        });
      });
    };
    label();
    let t: number | undefined;
    const obs = new MutationObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(label, 30);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); window.clearTimeout(t); };
  }, []);
  return null;
}
