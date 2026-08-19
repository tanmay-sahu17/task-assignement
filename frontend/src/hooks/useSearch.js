import { useState, useEffect } from 'react';
import { searchAPI } from '../api/api';
import useAuth from './useAuth';

export default function useSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchAPI.query(query);
        setResults(data);
      } catch (err) {
        console.error("Failed to query search results:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token]);

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setIsFocused(false);
  };

  return {
    query,
    setQuery,
    results,
    setResults,
    isFocused,
    setIsFocused,
    isLoading,
    clearSearch
  };
}
