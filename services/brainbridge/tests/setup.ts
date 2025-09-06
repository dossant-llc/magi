/**
 * Jest Test Setup
 * Configures the test environment for BrainBridge
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MAGI_ROOT = '/Users/igor/Documents/code/agiforme';
process.env.AI_PROVIDER = 'openai';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error logging for debugging
};

// Increase timeout for tests that might need AI calls
jest.setTimeout(30000);