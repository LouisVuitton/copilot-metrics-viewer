/**
 * Per-user token totals (prompt + output) from /api/user-metrics rows.
 *
 * Current GitHub user reports carry token usage per client in
 * `totals_by_client[].token_usage` (vscode, jetbrains, code_review, …). The
 * older `totals_by_cli.token_usage` is only used as a fallback when a row has
 * no client breakdown, so a CLI client is never counted twice.
 */

interface TokenUsage {
  prompt_tokens_sum?: number;
  output_tokens_sum?: number;
}

export interface UserTokenSource {
  totals_by_client?: { client: string; token_usage?: TokenUsage }[];
  totals_by_cli?: { token_usage?: TokenUsage };
}

function sumUsage(tu: TokenUsage | undefined): number {
  if (!tu) return 0;
  return (tu.prompt_tokens_sum || 0) + (tu.output_tokens_sum || 0);
}

export function totalUserTokens(u: UserTokenSource): number {
  if (Array.isArray(u.totals_by_client) && u.totals_by_client.length > 0) {
    return u.totals_by_client.reduce((s, c) => s + sumUsage(c.token_usage), 0);
  }
  return sumUsage(u.totals_by_cli?.token_usage);
}
