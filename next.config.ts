import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.NEXT_UI_TEST === '1' ? '.cache/next-ui' : '.next',
  outputFileTracingRoot: path.resolve(__dirname),
};
export default config;
