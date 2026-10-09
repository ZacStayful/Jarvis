import { describe, it, expect } from 'vitest';
import { routeCommand } from '@/lib/jarvis-design';

describe('vitest harness', () => {
  it('resolves the @ alias', () => {
    expect(typeof routeCommand).toBe('function');
  });
});
