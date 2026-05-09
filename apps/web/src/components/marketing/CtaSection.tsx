import { Button } from '@/components/ui/Button';
import { routes } from '@/constants/routes';

export function CtaSection() {
  return (
    <section
      id="get-started"
      className="scroll-mt-20 bg-primary-700"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:justify-between lg:px-8">
        <h2
          id="cta-heading"
          className="max-w-2xl text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl"
        >
          Ready to see what you actually pay?
          <br />
          Get started with Vetply today.
        </h2>
        <div className="mt-10 lg:mt-0 lg:shrink-0">
          <Button href={routes.signUp}>Get started</Button>
        </div>
      </div>
    </section>
  );
}
