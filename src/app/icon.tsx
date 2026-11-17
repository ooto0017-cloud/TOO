import {ImageResponse} from 'next/og';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export const size = {width: 64, height: 64};
export const contentType = 'image/png';
export default function Icon() {
  const image = readFileSync(join(process.cwd(), 'public/brand/logo.png'));
  return new ImageResponse(<img src={`data:image/png;base64,${image.toString('base64')}`} width={64} height={64} alt="Sbumiptk"/>, size);
}
