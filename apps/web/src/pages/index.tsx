import { CtaSection } from "@/components/marketing/CtaSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { Footer } from "@/components/marketing/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import Head from "next/head";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Vetply — Smarter supply buying for vet clinics</title>
        <meta
          name="description"
          content="Compare thousands of supplier prices and layer in your discounts, rebates, and deals—without living in Excel."
        />
      </Head>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  );
}
