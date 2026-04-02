import type { AppProps } from "next/app";
import { MeProviderShell } from "@/components/MeProviderShell";
import { SonnerToaster } from "@/components/SonnerToaster";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <MeProviderShell>
        <Component {...pageProps} />
      </MeProviderShell>
      <SonnerToaster />
    </>
  );
}
