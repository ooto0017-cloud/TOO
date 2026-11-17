import {createRequire} from 'node:module';
import {copyFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
const require = createRequire(import.meta.url);
mkdirSync(join(process.cwd(), 'public'), {recursive: true});
copyFileSync(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'), join(process.cwd(), 'public/pdf.worker.min.mjs'));
