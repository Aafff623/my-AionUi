/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { buildUpdateFeedOptions, UPDATE_FEED_OWNER, UPDATE_FEED_REPO } from '@/process/services/updateFeed';

describe('Fork update feed options', () => {
  it('builds a GitHub provider feed pointing at the fork repository', () => {
    const options = buildUpdateFeedOptions();

    expect(options.provider).toBe('github');
    expect(options.owner).toBe(UPDATE_FEED_OWNER);
    expect(options.repo).toBe(UPDATE_FEED_REPO);
  });

  it('never points at the upstream CDN or upstream repository', () => {
    const options = buildUpdateFeedOptions();

    expect(JSON.stringify(options)).not.toContain('static.aionui.com');
    expect(options.owner).not.toBe('iOfficeAI');
  });
});
