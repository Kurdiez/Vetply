import Image from "next/image";

export function HeroImagePanel() {
  return (
    <div className="min-w-0 max-w-full bg-gray-800 lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 lg:max-w-none">
      <div className="relative box-border flex aspect-[3/2] min-h-[280px] w-full max-w-full items-center justify-center overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 p-6 sm:p-8 lg:aspect-auto lg:size-full lg:p-12">
        <Image
          src="/supplies.png"
          alt="Veterinary supplies, pricing, and savings"
          fill
          className="object-contain object-center"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>
    </div>
  );
}
