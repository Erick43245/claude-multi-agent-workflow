---
name: api-conventions
description: Use when writing or reviewing Express routes, to follow this project's conventions for errors, validation and status codes.
---
- Validate all input at the start of each route handler.
- Return JSON errors as { "error": "message" } with the correct status code.
- Never swallow exceptions; pass them to next(err).