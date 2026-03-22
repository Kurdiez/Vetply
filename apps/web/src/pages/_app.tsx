import type { AppProps } from "next/app";
import { SonnerToaster } from "@/components/SonnerToaster";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <SonnerToaster />
    </>
  );
}
