import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface DailySearchStats {
  totalSearches: number
  completedSearches: number
  failedSearches: number  // searches with at least one failure row
  cancelledSearches: number
  stalledSearches: number  // running > 5 min, no completion
  avgDurationSec: number | null
  totalTokens: number
  byVisionModel: Record<string, { count: number; totalTokens: number }>
}

export async function sendDailySummary(to: string, stats: DailySearchStats) {
  const completionRate = stats.totalSearches > 0
    ? Math.round((stats.completedSearches / stats.totalSearches) * 100)
    : 0
  const stallRate = stats.totalSearches > 0
    ? Math.round((stats.stalledSearches / stats.totalSearches) * 100)
    : 0
  const cost = (stats.totalTokens / 1_000_000) * 3 // rough — assumes ~$3/M average

  const modelRows = Object.entries(stats.byVisionModel)
    .map(([model, m]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#aaaaaa;font-size:13px;">${model}</td><td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:500;text-align:right;">${m.count} searches · ${(m.totalTokens / 1000).toFixed(1)}k tokens</td></tr>`
    )
    .join('')

  await resend.emails.send({
    from: 'Eifara <notifications@eifara.com>',
    to,
    subject: `Eifara daily summary — ${stats.totalSearches} searches, ${completionRate}% completion`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0e0d0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0d0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;"><span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Eifara</span><span style="font-size:13px;color:#666666;margin-left:10px;">daily summary</span></td></tr>
        <tr><td style="background-color:#1a1a1a;border-radius:12px;padding:32px;">
          <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.16em;">Last 24 hours</p>
          <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:600;color:#ffffff;">${stats.totalSearches} searches</h1>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="50%" style="padding:14px 0;border-top:1px solid #2a2a2a;color:#aaa;font-size:13px;">Completed</td>
              <td width="50%" style="padding:14px 0;border-top:1px solid #2a2a2a;color:#ffffff;font-size:13px;font-weight:500;text-align:right;">${stats.completedSearches} (${completionRate}%)</td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:#aaa;font-size:13px;">With failures</td>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:${stats.failedSearches > 0 ? '#f59e0b' : '#ffffff'};font-size:13px;font-weight:500;text-align:right;">${stats.failedSearches}</td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:#aaa;font-size:13px;">Stalled (>5 min)</td>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:${stats.stalledSearches > 0 ? '#ef4444' : '#ffffff'};font-size:13px;font-weight:500;text-align:right;">${stats.stalledSearches} (${stallRate}%)</td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:#aaa;font-size:13px;">Cancelled</td>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:#ffffff;font-size:13px;font-weight:500;text-align:right;">${stats.cancelledSearches}</td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:#aaa;font-size:13px;">Avg duration</td>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;color:#ffffff;font-size:13px;font-weight:500;text-align:right;">${stats.avgDurationSec != null ? `${stats.avgDurationSec.toFixed(1)}s` : '—'}</td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;border-bottom:1px solid #2a2a2a;color:#aaa;font-size:13px;">Anthropic spend (est)</td>
              <td style="padding:14px 0;border-top:1px solid #2a2a2a;border-bottom:1px solid #2a2a2a;color:#ffffff;font-size:13px;font-weight:500;text-align:right;">$${cost.toFixed(2)} · ${(stats.totalTokens / 1000).toFixed(0)}k tokens</td>
            </tr>
          </table>

          ${modelRows ? `
          <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.16em;">By vision model</p>
          <table width="100%" cellpadding="0" cellspacing="0">${modelRows}</table>
          ` : ''}

          ${stats.stalledSearches > 0 ? `<p style="margin:24px 0 0 0;padding:14px;background:rgba(239,68,68,0.08);border-left:3px solid #ef4444;color:#ffffff;font-size:13px;line-height:1.5;">⚠ <strong>${stats.stalledSearches} stalled search${stats.stalledSearches !== 1 ? 'es' : ''}</strong> — check QStash dashboard for stuck jobs.</p>` : ''}
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;"><p style="margin:0;font-size:12px;color:#444;">Generated by /api/cron/search-summary</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })
}

export async function sendAnalysisComplete(
  to: string,
  location: string,
  matchCount: number,
  searchId: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const resultsUrl = `${appUrl}/results/${searchId}`

  await resend.emails.send({
    from: 'Eifara <notifications@eifara.com>',
    to,
    subject: `Your search results are ready — ${location}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Search results ready</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Eifara</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#242424;border-radius:12px;padding:36px 32px;">

              <p style="margin:0 0 8px 0;font-size:13px;font-weight:500;color:#888888;text-transform:uppercase;letter-spacing:0.8px;">Search complete</p>

              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;">
                ${matchCount} strong match${matchCount !== 1 ? 'es' : ''} found
              </h1>

              <p style="margin:0 0 28px 0;font-size:15px;color:#aaaaaa;line-height:1.5;">
                for <strong style="color:#ffffff;">${location}</strong>
              </p>

              <a
                href="${resultsUrl}"
                style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px;"
              >
                View Results
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                Eifara &mdash; AI-powered home search for realtors
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}

export async function sendPriceChangeAlert(
  to: string,
  address: string,
  oldPrice: number,
  newPrice: number,
  zillowId: string,
) {
  const zillowUrl = `https://www.zillow.com/homedetails/${zillowId}_zpid/`
  const diff = newPrice - oldPrice
  const direction = diff > 0 ? 'increased' : 'decreased'
  const diffAbs = Math.abs(diff)
  const pct = oldPrice > 0 ? ((diffAbs / oldPrice) * 100).toFixed(1) : '0.0'
  const arrowColor = diff > 0 ? '#ef4444' : '#22c55e'
  const arrow = diff > 0 ? '&#8593;' : '&#8595;'

  await resend.emails.send({
    from: 'Eifara <notifications@eifara.com>',
    to,
    subject: `Price ${direction} on a saved home — ${address}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Price change alert</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Eifara</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#242424;border-radius:12px;padding:36px 32px;">

              <p style="margin:0 0 8px 0;font-size:13px;font-weight:500;color:#888888;text-transform:uppercase;letter-spacing:0.8px;">Price alert</p>

              <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                A saved home's price has ${direction}
              </h1>

              <p style="margin:0 0 24px 0;font-size:14px;color:#aaaaaa;">${address}</p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-right:24px;">
                    <p style="margin:0;font-size:12px;color:#888888;margin-bottom:4px;">Previous price</p>
                    <p style="margin:0;font-size:18px;font-weight:600;color:#aaaaaa;">$${oldPrice.toLocaleString()}</p>
                  </td>
                  <td style="padding-right:24px;font-size:24px;color:${arrowColor};font-weight:700;">${arrow}</td>
                  <td>
                    <p style="margin:0;font-size:12px;color:#888888;margin-bottom:4px;">New price</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">$${newPrice.toLocaleString()}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px 0;font-size:14px;color:${arrowColor};font-weight:500;">
                ${arrow} $${diffAbs.toLocaleString()} (${pct}%)
              </p>

              <a
                href="${zillowUrl}"
                style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px;"
              >
                View on Zillow
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                Eifara &mdash; AI-powered home search for realtors
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}
