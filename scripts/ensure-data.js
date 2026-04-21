#!/usr/bin/env node

/**
 * Bootstrap data/ from sample-data/ when no vocab TTLs are present.
 * Cross-platform replacement for the bash build:ensure-data script.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const DATA_VOCABS = 'data/vocabs';
const DATA_BACKGROUND = 'data/background';
const DATA_CONFIG = 'data/config';
const SAMPLE_VOCABS = 'sample-data/vocabs';
const SAMPLE_BACKGROUND = 'sample-data/background';
const SAMPLE_CONFIG_PROFILES = 'sample-data/config/profiles.ttl';
const SAMPLE_MANIFEST = 'sample-data/manifest.ttl';

const listTtl = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.ttl'))
    : [];

const copyTtlFiles = (srcDir, destDir) => {
  for (const file of listTtl(srcDir)) {
    copyFileSync(join(srcDir, file), join(destDir, file));
  }
};

const needsBootstrap = listTtl(DATA_VOCABS).length === 0;

if (needsBootstrap) {
  console.log('No vocabs found in data/, using sample-data');

  mkdirSync(DATA_VOCABS, { recursive: true });
  mkdirSync(DATA_BACKGROUND, { recursive: true });
  mkdirSync(DATA_CONFIG, { recursive: true });

  copyTtlFiles(SAMPLE_VOCABS, DATA_VOCABS);

  if (existsSync(SAMPLE_CONFIG_PROFILES)) {
    copyFileSync(SAMPLE_CONFIG_PROFILES, join(DATA_CONFIG, 'profiles.ttl'));
  }

  if (existsSync(SAMPLE_MANIFEST)) {
    copyFileSync(SAMPLE_MANIFEST, 'data/manifest.ttl');
  }

  copyTtlFiles(SAMPLE_BACKGROUND, DATA_BACKGROUND);
}

mkdirSync(SAMPLE_BACKGROUND, { recursive: true });
const gitkeep = join(SAMPLE_BACKGROUND, '.gitkeep');
if (!existsSync(gitkeep)) {
  writeFileSync(gitkeep, '');
}
