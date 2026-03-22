import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@heroicons/react/20/solid";

const tiers = [
  {
    name: "Essentials",
    id: "tier-essentials",
    href: "/sign-up",
    priceMonthly: "$79",
    description:
      "For a single clinic that wants distributor pricing and rebates in one place—not another spreadsheet.",
    features: [
      "Compare pricing across major veterinary distributors",
      "Up to 3 team members",
      "Track contract tiers and manufacturer rebates",
      "CSV exports for ordering and finance",
      "Email support (2 business days)",
    ],
    mostPopular: false,
  },
  {
    name: "Professional",
    id: "tier-professional",
    href: "/sign-up",
    priceMonthly: "$199",
    description:
      "For busy practices that need shared access, richer analytics, and faster answers when programs change.",
    features: [
      "Everything in Essentials",
      "Unlimited team members",
      "Spend rollups by category, supplier, and time period",
      "Priority in-app chat support",
      "Rebate accrual views and audit-friendly history",
    ],
    mostPopular: true,
  },
  {
    name: "Organization",
    id: "tier-organization",
    href: "/sign-up",
    priceMonthly: "$449",
    description:
      "For groups and multi-location operators that need governance, rollups, and a partner in rollout.",
    features: [
      "Everything in Professional",
      "Multi-location dashboards and consolidated reporting",
      "SSO and role-based admin controls",
      "Dedicated onboarding and quarterly business reviews",
      "Optional custom data feeds and integrations",
    ],
    mostPopular: false,
  },
];

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 relative z-[1] -mt-px bg-gray-900 pt-0 pb-24 sm:pb-32 lg:pb-32"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-base/7 font-semibold text-primary-100">Pricing</p>
          <h2
            id="pricing-heading"
            className="mt-2 text-5xl font-semibold tracking-tight text-balance text-white sm:text-6xl"
          >
            Plans that match how you buy
          </h2>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
          Pick the level of visibility and support you need. Every plan includes a{" "}
          <span className="text-gray-300">1-month free trial</span>—no commitment until you are ready.
        </p>
        <div className="mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:isolate lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier, tierIdx) => (
            <div
              key={tier.id}
              className={classNames(
                tier.mostPopular ? "lg:z-10 lg:rounded-b-none" : "lg:mt-8",
                tierIdx === 0 ? "lg:-mr-px lg:rounded-r-none" : "",
                tierIdx === tiers.length - 1 ? "lg:-ml-px lg:rounded-l-none" : "",
                "flex flex-col justify-between rounded-3xl bg-gray-800/50 p-8 ring-1 ring-inset ring-gray-700 xl:p-10",
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={classNames(
                      tier.mostPopular ? "text-primary-100" : "text-white",
                      "text-lg/8 font-semibold",
                    )}
                  >
                    {tier.name}
                  </h3>
                  {tier.mostPopular ? (
                    <p className="rounded-full bg-primary-500/15 px-2.5 py-1 text-xs/5 font-semibold text-primary-100">
                      Most popular
                    </p>
                  ) : null}
                </div>
                <p className="mt-4 text-sm/6 text-gray-300">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-semibold tracking-tight text-white">
                    {tier.priceMonthly}
                  </span>
                  <span className="text-sm/6 font-semibold text-gray-400">/month</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm/6 text-gray-300">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon
                        aria-hidden="true"
                        className="h-6 w-5 flex-none text-primary-100"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                href={tier.href}
                aria-describedby={tier.id}
                fullWidth
                variant={tier.mostPopular ? "primary" : "secondary"}
                className="mt-8"
              >
                Start free trial
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
