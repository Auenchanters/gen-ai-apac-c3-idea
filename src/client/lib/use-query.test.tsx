// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from './use-query.js';

afterEach(cleanup);

function Probe(props: { readonly load: () => Promise<string> }): React.JSX.Element {
  const query = useQuery(props.load);
  return (
    <div>
      <p>{query.loading ? 'loading' : (query.data ?? query.error)}</p>
      <button onClick={query.reload}>Reload</button>
    </div>
  );
}

describe('useQuery state transitions', () => {
  it('loads data and supports an explicit reload', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    render(<Probe load={load} />);
    expect(await screen.findByText('first')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByText('second')).toBeDefined();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('maps failures to safe feedback and can retry', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('private upstream'))
      .mockResolvedValueOnce('recovered');
    render(<Probe load={load} />);
    expect(await screen.findByText('We could not load this. Please try again.')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByText('recovered')).toBeDefined();
  });

  it('ignores a result after the component unmounts', async () => {
    let resolve: (value: string) => void = () => undefined;
    const load = vi.fn<() => Promise<string>>(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const view = render(<Probe load={load} />);
    view.unmount();
    resolve('late result');
    await Promise.resolve();
    expect(screen.queryByText('late result')).toBeNull();
  });

  it('ignores a failure after the component unmounts', async () => {
    let reject: (reason?: unknown) => void = () => undefined;
    const load = vi.fn<() => Promise<string>>(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    );
    const view = render(<Probe load={load} />);
    view.unmount();
    reject(new Error('late failure'));
    await Promise.resolve();
    expect(screen.queryByText('We could not load this. Please try again.')).toBeNull();
  });
});
