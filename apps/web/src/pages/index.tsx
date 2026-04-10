import { CtaSection } from "@/components/marketing/CtaSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { Footer } from "@/components/marketing/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import {
  HOME_PAGE_SEO,
  SITE_NAME,
  absoluteUrl,
  getPublicSiteUrl,
} from "@/constants/seo";
import Head from "next/head";

export default function HomePage() {
  const siteUrl = getPublicSiteUrl();
  const canonical = absoluteUrl("/");
  const ogImage = absoluteUrl(HOME_PAGE_SEO.ogImagePath);

  const jsonLd =
    siteUrl !== undefined
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          description: HOME_PAGE_SEO.description,
          url: siteUrl,
          publisher: {
            "@type": "Organization",
            name: "Vetply, Inc.",
            url: siteUrl,
          },
        }
      : null;

  return (
    <>
      <Head>
        <meta name="description" content={HOME_PAGE_SEO.description} />
        <meta name="keywords" content={HOME_PAGE_SEO.keywords} />
        <meta name="robots" content="index, follow" />
        {canonical ? <link rel="canonical" href={canonical} /> : null}

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={HOME_PAGE_SEO.title} />
        <meta
          property="og:description"
          content={HOME_PAGE_SEO.description}
        />
        <meta property="og:locale" content="en_US" />
        {canonical ? <meta property="og:url" content={canonical} /> : null}
        {ogImage ? (
          <>
            <meta property="og:image" content={ogImage} />
            <meta
              property="og:image:width"
              content={String(HOME_PAGE_SEO.ogImageWidth)}
            />
            <meta
              property="og:image:height"
              content={String(HOME_PAGE_SEO.ogImageHeight)}
            />
            <meta
              property="og:image:alt"
              content={HOME_PAGE_SEO.ogImageAlt}
            />
          </>
        ) : null}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={HOME_PAGE_SEO.title} />
        <meta
          name="twitter:description"
          content={HOME_PAGE_SEO.description}
        />
        {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
      </Head>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  );
}
