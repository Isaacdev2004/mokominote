import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import type { CurrentUser, Post } from "./generated/api.schemas";
import { customFetch } from "./custom-fetch";

export function useUpdateProfile(
  options?: UseMutationOptions<CurrentUser, Error, { name?: string; bio?: string | null; avatarUrl?: string | null }>,
) {
  return useMutation({
    mutationFn: (data) =>
      customFetch<CurrentUser>("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useForgotPassword(options?: UseMutationOptions<{ success: true; devResetToken?: string }, Error, { email: string }>) {
  return useMutation({
    mutationFn: (data) =>
      customFetch<{ success: true; devResetToken?: string }>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useResetPassword(options?: UseMutationOptions<{ success: true }, Error, { token: string; password: string }>) {
  return useMutation({
    mutationFn: (data) =>
      customFetch<{ success: true }>("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useMarkAllNotificationsRead(options?: UseMutationOptions<{ success: true }, Error, void>) {
  return useMutation({
    mutationFn: () => customFetch<{ success: true }>("/api/notifications/read-all", { method: "PATCH" }),
    ...options,
  });
}

export function getCommunityFeedQueryKey(page = 1) {
  return ["/api/community/feed", page] as const;
}

export function useCommunityFeed(page = 1, options?: { query?: UseQueryOptions<{ items: Post[]; page: number; total: number }> }) {
  return useQuery({
    queryKey: getCommunityFeedQueryKey(page),
    queryFn: () => customFetch<{ items: Post[]; page: number; total: number }>(`/api/community/feed?page=${page}&pageSize=8`),
    ...options?.query,
  });
}

export function useAdminPosts(params: { status?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.page) search.set("page", String(params.page));
  return useQuery({
    queryKey: ["/api/admin/posts", params],
    queryFn: () => customFetch<{ items: Post[]; page: number; total: number }>(`/api/admin/posts?${search.toString()}`),
  });
}

export function useUpdateAdminPostStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "published" | "hidden" }) =>
      customFetch<Post>(`/api/admin/posts/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
  });
}

export function usePaymentProducts() {
  return useQuery({
    queryKey: ["/api/payments/products"],
    queryFn: () =>
      customFetch<{
        items: { id: string; name: string; description: string; type: string; amount: number; currency: string }[];
        mode: "live" | "development";
      }>("/api/payments/products"),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: { productId: string; businessId?: string }) =>
      customFetch<{
        transactionId: string;
        checkoutUrl: string | null;
        status: string;
        provider: string;
        mode: string;
        message: string;
      }>("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (data: { kind: "avatar" | "logo" | "cover" | "post"; dataUrl: string }) =>
      customFetch<{ url: string; mimeType: string; size: number }>("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
