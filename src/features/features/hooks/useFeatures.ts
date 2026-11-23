"use client";

import { useQuery } from "@tanstack/react-query";

import { getFeatures, type FeatureName } from "@/features/features/api/features";

export const featureKeys = {
  all: ["features"] as const,
};

/** The release flags; they change only with a deployment, so they are read once. */
export function useFeatures() {
  return useQuery({ queryKey: featureKeys.all, queryFn: getFeatures, staleTime: Infinity });
}

/** True only once the flags have loaded and the named one is on: hidden until known. */
export function useFeature(name: FeatureName): boolean {
  const { data } = useFeatures();
  return data?.[name] === true;
}
