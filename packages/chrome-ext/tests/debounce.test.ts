import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/util/debounce.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('debounce', () => {
  it('does not call through before the delay elapses', () => {
    const fn = vi.fn();
    debounce(fn, 100)();

    vi.advanceTimersByTime(99);

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls through once the delay elapses', () => {
    const fn = vi.fn();
    debounce(fn, 100)();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('collapses a burst of calls into a single invocation', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the arguments of the most recent call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('second');
  });

  it('restarts the delay on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(90);
    debounced();
    vi.advanceTimersByTime(90);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs again after a completed delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
