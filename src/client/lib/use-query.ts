import { useCallback, useEffect, useState } from 'react';

/** Loads private data with stale-response suppression and explicit retry.
 * @param load - Stable callback for the current resource.
 * @returns Data, pending/error state and reload action.
 */
export function useQuery<T>(load: () => Promise<T>): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void load()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch(() => {
        if (active)
          setState({
            data: null,
            loading: false,
            error: 'We could not load this. Please try again.'
          });
      });
    return () => {
      active = false;
    };
  }, [load, revision]);
  const reload = useCallback(() => {
    setState({ data: null, loading: true, error: null });
    setRevision((value) => value + 1);
  }, []);
  return { ...state, reload };
}
