/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GithubOptions } from 'builder-util-runtime';

/**
 * Fork update feed: the packaged app checks this fork's GitHub releases.
 * Upstream AionUi's CDN feed (static.aionui.com) is intentionally NOT used —
 * pointing a fork build at upstream releases would offer upstream binaries.
 */
export const UPDATE_FEED_OWNER = 'Aafff623';
export const UPDATE_FEED_REPO = 'my-AionUi';

export type UpdateFeedOptions = GithubOptions & {
  updateProvider?: never;
};

export function buildUpdateFeedOptions(): UpdateFeedOptions {
  return {
    provider: 'github',
    owner: UPDATE_FEED_OWNER,
    repo: UPDATE_FEED_REPO,
  };
}
