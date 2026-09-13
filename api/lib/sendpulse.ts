type SendPulseRecipient = { email: string; name?: string }

export type SendPulseEmail = {
  to: SendPulseRecipient[]
  subject: string
  html: string
  text: string
  fromName?: string
}

const baseUrl = () => (process.env.SENDPULSE_API_BASE_URL || 'https://api.sendpulse.com').replace(/\/$/, '')

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const sendPulseRequest = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required('SENDPULSE_API_KEY')}`,
      Accept: 'application/json',
      ...init.headers,
    },
  })

  const body = await response.text()
  if (!response.ok) {
    const quotaHint = response.status === 429 ? ' SendPulse rejected the request because of a quota or rate limit.' : ''
    throw new Error(`SendPulse API request failed (${response.status}): ${body || response.statusText}.${quotaHint}`)
  }

  try {
    return body ? JSON.parse(body) as Record<string, unknown> : {}
  } catch {
    return { raw: body }
  }
}

export const verifyAuth = () => sendPulseRequest('/user/info')

export const sendEmail = (email: SendPulseEmail) => {
  const fromEmail = required('SENDPULSE_API_FROM_EMAIL')
  return sendPulseRequest('/smtp/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: {
        subject: email.subject,
        html: email.html,
        text: email.text,
        from: { email: fromEmail, name: email.fromName || process.env.SENDPULSE_API_FROM_NAME || 'Detailflow' },
        to: email.to,
      },
    }),
  })
}
