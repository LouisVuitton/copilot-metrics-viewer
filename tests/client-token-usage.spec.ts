/**
 * Per-user token usage from `totals_by_client` — the field current GitHub
 * user reports actually carry (they have no `totals_by_cli`). Feeds the
 * Billing tab's "Top token users" chart and per-user "Tokens" column.
 */

import { describe, it, expect } from 'vitest';
import { aggregateUserDayRecords, type UserDayRecord } from '../server/services/github-copilot-usage-api';
import { totalUserTokens } from '../app/utils/tokenUsage';

const baseDay = (overrides: Partial<UserDayRecord> = {}): UserDayRecord => ({
  report_start_day: '2026-11-01',
  report_end_day: '2026-11-28',
  day: '2026-11-20',
  organization_id: '1',
  enterprise_id: '1',
  user_id: 100,
  user_login: 'alice',
  user_initiated_interaction_count: 1,
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  ...overrides,
});

describe('aggregateUserDayRecords — totals_by_client', () => {
  it('sums requests, sessions and tokens per client across days', () => {
    const [alice] = aggregateUserDayRecords([
      baseDay({
        day: '2026-11-20',
        totals_by_client: [
          { client: 'vscode', request_count: 10, session_count: 1, token_usage: { prompt_tokens_sum: 1000, output_tokens_sum: 100, avg_tokens_per_request: 110 } },
          { client: 'code_review', request_count: 2, session_count: 2, token_usage: { prompt_tokens_sum: 500, output_tokens_sum: 50, avg_tokens_per_request: 275 } },
        ],
      }),
      baseDay({
        day: '2026-11-21',
        totals_by_client: [
          { client: 'vscode', request_count: 10, session_count: 1, token_usage: { prompt_tokens_sum: 3000, output_tokens_sum: 300, avg_tokens_per_request: 330 } },
        ],
      }),
    ]);

    const byClient = Object.fromEntries((alice!.totals_by_client ?? []).map(c => [c.client, c]));
    expect(Object.keys(byClient).sort()).toEqual(['code_review', 'vscode']);
    expect(byClient.vscode!.request_count).toBe(20);
    expect(byClient.vscode!.session_count).toBe(2);
    expect(byClient.vscode!.token_usage!.prompt_tokens_sum).toBe(4000);
    expect(byClient.vscode!.token_usage!.output_tokens_sum).toBe(400);
    // avg = (4000 + 400) / 20
    expect(byClient.vscode!.token_usage!.avg_tokens_per_request).toBe(220);
    expect(byClient.code_review!.token_usage!.prompt_tokens_sum).toBe(500);
  });

  it('leaves totals_by_client undefined when no day had client data', () => {
    const [alice] = aggregateUserDayRecords([baseDay({})]);
    expect(alice!.totals_by_client).toBeUndefined();
  });
});

describe('totalUserTokens', () => {
  it('sums prompt + output tokens across all clients', () => {
    expect(totalUserTokens({
      totals_by_client: [
        { client: 'vscode', token_usage: { prompt_tokens_sum: 4000, output_tokens_sum: 400 } },
        { client: 'code_review', token_usage: { prompt_tokens_sum: 500, output_tokens_sum: 50 } },
        { client: 'github_web' },
      ],
    })).toBe(4950);
  });

  it('falls back to totals_by_cli only when there is no client breakdown', () => {
    expect(totalUserTokens({ totals_by_cli: { token_usage: { prompt_tokens_sum: 300, output_tokens_sum: 150 } } })).toBe(450);
    expect(totalUserTokens({
      totals_by_client: [{ client: 'copilot_cli', token_usage: { prompt_tokens_sum: 300, output_tokens_sum: 150 } }],
      totals_by_cli: { token_usage: { prompt_tokens_sum: 300, output_tokens_sum: 150 } },
    })).toBe(450);
  });

  it('returns 0 when there is no token data', () => {
    expect(totalUserTokens({})).toBe(0);
  });
});
