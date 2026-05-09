import {
  ArrowsRightLeftIcon,
  ReceiptPercentIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Compare supplier pricing',
    description:
      'See prices across distributors on the products you already buy—without jumping between catalogs, portals, and emailed quotes.',
    icon: ArrowsRightLeftIcon,
  },
  {
    name: 'Your discounts and rebates, layered in',
    description:
      'Apply manufacturer rebates, contract tiers, and one-off deals on top of list price so you know your true net cost—not a fantasy spreadsheet.',
    icon: ReceiptPercentIcon,
  },
  {
    name: 'One view of what you pay',
    description:
      'Replace scattered files with a single place for item-level pricing that reflects how your clinic actually purchases.',
    icon: Squares2X2Icon,
  },
  {
    name: 'Leave the spreadsheet rebuild behind',
    description:
      'Stop re-merging tabs every week when prices or programs change. Work from numbers that stay tied to suppliers and your terms.',
    icon: TableCellsIcon,
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative z-0 scroll-mt-20 bg-gray-900 py-24 sm:py-32"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          <h2
            id="features-heading"
            className="col-span-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl"
          >
            Optimize supply spend in one place
          </h2>
          <dl className="col-span-3 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.name}>
                <dt className="text-base/7 font-semibold text-white">
                  <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-primary-500">
                    <feature.icon
                      aria-hidden="true"
                      className="size-6 text-white"
                    />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-1 text-base/7 text-gray-400">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
