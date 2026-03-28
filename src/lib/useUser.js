"use client";

import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/me", fetcher);

  return {
    user: data?.user || null,
    isLoading,
    isError: error,
    mutate,
  };
}
