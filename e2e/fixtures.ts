import { test as base, expect } from '@playwright/test';

/**
 * Every E2E and visual test runs under two guards (HANDOFF §10): a request to any other origin is
 * blocked and fails the test, and so does any console error or warning or uncaught page error.
 */
export const test = base.extend<{ guards: void }>({
  guards: [
    async ({ context, baseURL }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin;
      const crossOrigin: string[] = [];
      const consoleProblems: string[] = [];

      await context.route(
        (url) => url.origin !== origin,
        (route) => {
          crossOrigin.push(route.request().url());
          return route.abort('blockedbyclient');
        },
      );
      context.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          consoleProblems.push(`${message.type()}: ${message.text()}`);
        }
      });
      context.on('weberror', (error) =>
        consoleProblems.push(`page error: ${error.error().message}`),
      );

      await use();

      expect(crossOrigin, 'requests to another origin').toEqual([]);
      expect(consoleProblems, 'console errors and warnings').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
