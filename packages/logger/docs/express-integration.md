# Express Integration

This guide shows how to integrate `@tkottke90/logger` into an Express application, making the logger available as a typed singleton throughout the entire backend.

## Overview

The integration follows three steps:

1. Initialize the logger and attach it to the Express `Application` instance
2. Augment Express types so `app.logger` is fully typed everywhere
3. Use the logger in routes and middleware

---

## Step 1: Logger Setup Module

Create a dedicated setup module that initializes the logger singleton and attaches it to the app:

```typescript
// src/lib/logger.ts
import { configureFromSchema, Logger, LoggerConfigSchema } from '@tkottke90/logger'
import { Express } from 'express'
import { config } from './config'

export let logger: Logger

export function setupLogger(app: Express) {
  logger = configureFromSchema('my-app', {
    level: config.logLevel,
    console: { enabled: true },
    file: {
      log: { filename: config.logFile },
      error: { filename: config.errorLogFile },
    },
  })

  app.logger = logger
}
```

The exported `logger` singleton can be imported directly by any module. Attaching it to `app.logger` also makes it accessible anywhere you have a reference to the Express application instance.

In your app entry point, call `setupLogger` early — before registering routes or middleware:

```typescript
// src/app.ts
import express from 'express'
import { setupLogger } from './lib/logger'

const app = express()

setupLogger(app)

// ...register middleware, routes, etc.
```

---

## Step 2: TypeScript Module Augmentation

Augment the Express core types so `app.logger` and `req.logger` are typed throughout the codebase without casting:

```typescript
// src/lib/types/application.ts
import { Logger } from '@tkottke90/logger'

declare module 'express-serve-static-core' {
  interface Application {
    logger: Logger
  }
  interface Request {
    logger: Logger
  }
}
```

Import this file in your app entry point (or include it in your `tsconfig.json` `include` list) to ensure the declarations are picked up globally.

---

## Step 3: Usage in Routes and Middleware

Routes can access the logger via the singleton import or through `app.logger`. The singleton import is simpler for most cases:

```typescript
// src/auth/router.ts
import { Router } from 'express'
import { logger } from '../lib/logger'

const router = Router()

router.get('/me', (req, res) => {
  logger.info('auth.me.requested')
  // ...
})

router.post('/login', async (req, res) => {
  try {
    // ...
    logger.info('auth.login.success', { sub })
  } catch (err) {
    logger.error('auth.login.initiation_failed', { error: String(err) })
    res.status(500).json({ error: 'Login failed' })
  }
})
```

Log keys follow a `domain.action.outcome` convention, with an optional metadata object as the second argument. This keeps logs structured and easy to filter.

In middleware factories that receive the `app` instance, use `app.logger` directly:

```typescript
// src/middleware/auth.ts
import { Express, RequestHandler } from 'express'

export function authMiddleware(app: Express): RequestHandler {
  return (req, res, next) => {
    // ...
    app.logger.warn('auth.token.rejected', { reason: 'invalid_signature' })
    res.status(401).end()
  }
}
```

---

## Per-Request Child Loggers (optional)

To attach a `reqId` or other request-scoped fields to every log line automatically, create a child logger in middleware and attach it to `req`:

```typescript
// src/middleware/httpLogger.ts
import { RequestHandler } from 'express'
import { logger } from '../lib/logger'

export const httpLogger: RequestHandler = (req, res, next) => {
  const route = [req.method.toLowerCase(), req.path.replace(/\//g, '-')].join('-')

  req.logger = logger.createChildLogger(route, {
    reqId: crypto.randomUUID(),
    user: req.user?.email,
  })

  req.logger.info(`${req.method} ${req.path}`)
  next()
}
```

Handlers then call `req.logger` instead of the root logger, and every message automatically carries the request metadata:

```typescript
router.get('/posts', (req, res) => {
  req.logger.debug('Loading posts')
  // [DEBUG] [my-app.get-posts] Loading posts { "reqId": "…", "user": "user@example.com" }
  res.json(posts)
})
```

> **Note:** Do not call `logger.createChildLogger()` before `setupLogger` has run — the singleton is not yet initialized. Always create child loggers inside a request handler or factory function that runs after setup.

---

## Access Pattern Summary

| Access point | When to use |
|---|---|
| `import { logger } from '../lib/logger'` | Most route handlers and service modules |
| `app.logger` | Middleware factories that receive the app instance |
| `req.logger` | Per-request child loggers with request-scoped metadata |

The singleton pattern keeps the setup simple and avoids threading a logger instance through every function signature, while the `app.logger` attachment ensures it's also reachable anywhere the Express app object is in scope.
