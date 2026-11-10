# SMS webhook (later)

The future webhook should accept a request containing `{ "from": "...", "text": "41 OK" }`.
It should validate `text` with `parseSmsCommand` from `@workbench/shared`, reject commands
that mention a locked field, and return a small success or error response. No webhook or
network service is included in this scaffold.
