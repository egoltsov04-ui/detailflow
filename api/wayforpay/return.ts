type Request = { method?: string }
type Response = { setHeader: (name: string, value: string) => void; status: (code: number) => Response; send: (body: string) => void }

export default function handler(request: Request, response: Response) {
  if (request.method !== 'POST' && request.method !== 'GET') return response.status(405).send('Method not allowed')
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.status(200).send('<!doctype html><html lang="uk"><head><meta http-equiv="refresh" content="0;url=/?payment=return"></head><body>Повертаємося до Detailflow…</body></html>')
}
