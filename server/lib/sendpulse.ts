export class EmailDeliveryError extends Error { uncertain:boolean; constructor(message:string,uncertain:boolean){super(message);this.uncertain=uncertain} }
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
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${required('SENDPULSE_API_KEY')}`,
      Accept: 'application/json',
      ...init.headers,
    },
  })

  const body = await response.text()
  if (!response.ok) {
    const quotaHint = response.status === 429 ? ' SendPulse rejected the request because of a quota or rate limit.' : ''
    throw new EmailDeliveryError(`SendPulse rejected delivery (${response.status}).${quotaHint}`,response.status>=500)
  }

  try {
    const result=body ? JSON.parse(body) as Record<string, unknown> : {};if(result.result===false)throw new EmailDeliveryError('SendPulse rejected delivery',false);return result
  } catch(error) {
    if(error instanceof EmailDeliveryError)throw error;throw new EmailDeliveryError('Unrecognized SendPulse delivery response',true)
  }
}

export const verifyAuth = () => sendPulseRequest('/user/info')

export const sendEmail = async (email: SendPulseEmail) => {
  const fromEmail = required('SENDPULSE_API_FROM_EMAIL')
  const result=await sendPulseRequest('/smtp/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: {
        subject: email.subject,
        html: Buffer.from(email.html,'utf8').toString('base64'),
        text: email.text,
        from: { email: fromEmail, name: email.fromName || process.env.SENDPULSE_API_FROM_NAME || 'Detailflow' },
        to: email.to,
      },
    }),
  })
  if(result.result!==true||typeof result.id!=='string'||!result.id)throw new EmailDeliveryError('Unrecognized SendPulse delivery response',true)
  return result
}
