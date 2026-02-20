# RULES.md — Carbon Credit Platform Engineering Rules

> **These rules are law.** All code must comply. Any violation must be corrected before merge.

---

## 1. ARCHITECTURE RULES

| Rule | Detail |
|------|--------|
| **Blockchain is the single source of truth** | All token balances, ownership, and transfer history are read from the chain. MongoDB is a read-cache only. |
| **MongoDB is only a cache/index layer** | Never treat DB records as authoritative for token amounts. |
| **Never trust manual transaction inserts** | Every `Transaction` document must originate from a confirmed on-chain event. |
| **All token movements originate from blockchain events** | The event indexer creates DB records AFTER events are observed on-chain. |
| **Controllers must not contain business logic** | Controllers only call service methods and return responses. |
| **Services contain all business logic** | Validation, blockchain calls, DB operations — all in services. |
| **Routes must be thin** | Routes only wire middleware + controller. No logic allowed. |
| **No circular dependencies** | Enforce with eslint-plugin-import. |
| **Use ES modules only** | `import`/`export` syntax only. No `require()`. |

---

## 2. SECURITY RULES

| Rule | Detail |
|------|--------|
| **No secrets in code** | All credentials via environment variables. No hardcoded keys, URIs, or tokens. |
| **All inputs validated** | Every route uses a Joi/Zod schema before reaching the controller. |
| **JWT required for protected routes** | `auth.middleware.js` must be applied to all non-public endpoints. |
| **Role-based authorization mandatory** | `role.middleware.js` restricts endpoints by `USER`, `VERIFIER`, `ADMIN`. |
| **Rate limiting required** | `express-rate-limit` on all routes, stricter on auth endpoints. |
| **Helmet required** | `helmet()` applied globally in `app.js`. |
| **CORS restricted** | `cors()` uses an allowlist from `CORS_ORIGIN` env var. |

---

## 3. CODE QUALITY RULES

| Rule | Detail |
|------|--------|
| **Max function length: 50 lines** | Split large functions into helpers. ESLint enforced. |
| **Max file length: 300 lines** | Split large files into modules. ESLint enforced. |
| **No `console.log` in production** | Use `logger.info()`, `logger.error()`, `logger.warn()` from `utils/logger.js`. |
| **Async/await only** | No raw `.then().catch()` chains. |
| **All async routes wrapped in `asyncHandler`** | Never use `try/catch` directly in route handlers. |
| **Proper error classes required** | Throw `ApiError` with status code and message. |
| **Use environment variables everywhere** | Import from `config/env.js` — never `process.env.X` inline. |
| **Use try/catch in all service methods** | Services must catch and rethrow `ApiError` instances. |

---

## 4. BLOCKCHAIN RULES

| Rule | Detail |
|------|--------|
| **Always wait for tx confirmation** | Use `tx.wait(confirmations)` before marking success. |
| **Always store `txHash`** | Every on-chain action produces a stored `txHash` field. |
| **Prevent duplicate transaction inserts** | Use `txHash` as a unique index. Idempotent upsert pattern. |
| **Never compute balances from DB** | Call `contract.balanceOf(address)` on-chain. |
| **Always fetch balances from chain** | Portfolio endpoint reads from blockchain, not MongoDB. |

---

## 5. DATABASE RULES

| Rule | Detail |
|------|--------|
| **Required indexes must be defined** | Define indexes in schema with `schema.index(...)`. |
| **Use timestamps on all schemas** | All schemas use `{ timestamps: true }`. |
| **Use `lean()` for read-heavy queries** | `Model.find().lean()` returns plain JS objects. |
| **Paginate large queries** | Use `utils/pagination.js` helper. Never return unbounded arrays. |
| **Validate ObjectIds** | Middleware validates all `:id` params before controller call. |

---

## Enforcement

- ESLint + Prettier runs on every commit via `lint-staged` + Husky.
- Commitlint enforces conventional commit format.
- `max-lines-per-function` and `max-lines` are ESLint rules.
- `no-console` is a warning in dev, error in production config.
