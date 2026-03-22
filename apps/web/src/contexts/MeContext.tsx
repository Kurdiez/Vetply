"use client";

import type { UserGetMeRes } from "@vetply/shared";
import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isAxiosError } from "axios";
import {
  clearStoredAccessToken,
  VETPLY_ACCESS_TOKEN_KEY,
} from "@/utils/vetply-api/storage";
import { fetchUserGetMe } from "@/utils/vetply-api/user-api";

type MeStatus = "idle" | "loading" | "ready" | "error";

type MeContextValue = {
  me: UserGetMeRes | null;
  status: MeStatus;
  refetch: () => Promise<void>;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<UserGetMeRes | null>(null);
  const [status, setStatus] = useState<MeStatus>("idle");

  const refetch = useCallback(async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(VETPLY_ACCESS_TOKEN_KEY)
        : null;
    if (!token) {
      await router.replace("/sign-in");
      return;
    }
    setStatus("loading");
    try {
      const data = await fetchUserGetMe();
      setMe(data);
      setStatus("ready");
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 401) {
        clearStoredAccessToken();
        await router.replace("/sign-in");
        return;
      }
      setMe(null);
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <MeContext.Provider value={{ me, status, refetch }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) {
    throw new Error("useMe must be used within MeProvider");
  }
  return ctx;
}
