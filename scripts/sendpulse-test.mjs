const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const baseUrl = (process.env.SENDPULSE_API_BASE_URL || 'https://api.sendpulse.com').replace(/\/$/, '')
const apiKey = required('SENDPULSE_API_KEY')
const recipient = required('SENDPULSE_TEST_TO')
const from = required('SENDPULSE_API_FROM_EMAIL')

const auth = await fetch(`${baseUrl}/user/info`, { headers: { Authorization: `Bearer ${apiKey}` } })
if (!auth.ok) throw new Error(`SendPulse authentication failed (${auth.status}): ${await auth.text()}`)

const response = await fetch(`${baseUrl}/smtp/emails`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ email: {
    subject: 'Detailflow: test email',
    html: '<p>SendPulse API integration is configured.</p>',
    text: 'SendPulse API integration is configured.',
    from: { email: from, name: process.env.SENDPULSE_API_FROM_NAME || 'Detailflow' },
    to: [{ email: recipient }],
  } }),
})

const body = await response.text()
if (!response.ok) throw new Error(`SendPulse test email failed (${response.status}): ${body}`)
console.log(`Test email accepted by SendPulse: ${body}`)
