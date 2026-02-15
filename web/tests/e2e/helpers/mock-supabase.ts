import { createServer, IncomingMessage, ServerResponse } from "node:http"

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.end(JSON.stringify(payload))
}

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? "GET"
  const url = new URL(req.url ?? "/", "http://127.0.0.1:54321")

  if (method === "OPTIONS") {
    sendJson(res, 204, {})
    return
  }

  if (method === "GET" && url.pathname === "/auth/v1/user") {
    sendJson(res, 401, { message: "Invalid JWT", error: "invalid_token" })
    return
  }

  if (method === "POST" && url.pathname === "/auth/v1/otp") {
    sendJson(res, 200, { user: null, session: null })
    return
  }

  if (method === "POST" && url.pathname === "/auth/v1/token") {
    sendJson(res, 400, { error: "invalid_grant", error_description: "mock invalid code" })
    return
  }

  sendJson(res, 404, { error: "not_found" })
}

export async function startMockSupabase(port: number): Promise<() => Promise<void>> {
  const server = createServer(handleRequest)
  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve())
  })

  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
}
