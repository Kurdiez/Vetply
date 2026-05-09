import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MeProviderShell } from '@/components/MeProviderShell';
import { SonnerToaster } from '@/components/SonnerToaster';
import { documentTitleForPathname } from '@/constants/seo';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const documentTitle = documentTitleForPathname(router.pathname);

  return (
    <>
      <Head>
        <title>{documentTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#111827" />
        <link
          rel="icon"
          type="image/png"
          href="/favicon/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </Head>
      <MeProviderShell>
        <Component {...pageProps} />
      </MeProviderShell>
      <SonnerToaster />
    </>
  );
}
