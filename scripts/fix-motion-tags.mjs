import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/features/mobile-stage');

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.tsx')) {
      let s = fs.readFileSync(p, 'utf8');
      s = s.replace(/<\/?motion-safe-[a-z0-9-]+/g, (m) => {
        if (m.startsWith('</')) return '</motion-safe-temp';
        return '<motion-safe-temp';
      });
      s = s.replace(/<motion-safe-temp/g, '<div');
      s = s.replace(/<\/motion-safe-temp>/g, '</div>');
      fs.writeFileSync(p, s);
      console.log('fixed', p);
    }
  }
}

walk(root);
