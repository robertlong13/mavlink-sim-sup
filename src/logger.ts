const el = document.getElementById('log') as HTMLPreElement;

export function log(...args: unknown[]) {
  const s = args
    .map(a => {
      if (a instanceof ArrayBuffer) return `<ArrayBuffer ${a.byteLength} bytes>`;
      try {
        return typeof a === 'string' ? a : JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
  const line = `[${new Date().toISOString()}] ${s}`;
  console.log(line);
  if (el) {
    el.textContent += line + '\n';
    el.scrollTop = el.scrollHeight;
  }
}

export function hr() {
  log('—'.repeat(40));
}
