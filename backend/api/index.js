"use strict";

/**
 * Vercel serverless entry: routes all HTTP traffic to the Express app.
 * Local dev still uses `npm run dev` → src/index.ts (plain Node listen).
 */
const serverless = require("serverless-http");
const { app } = require("../dist/app.js");

module.exports = serverless(app);
