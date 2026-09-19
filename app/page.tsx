import { Hero } from "@/components/home/Hero";
import { LiveDrops } from "@/components/home/LiveDrops";
import { Stats } from "@/components/home/Stats";
import { FeaturedCases } from "@/components/home/FeaturedCases";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PartnersTeaser } from "@/components/home/PartnersTeaser";
import { TopPlayers } from "@/components/home/TopPlayers";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LiveDrops />
      <div className="pt-10 lg:pt-14">
        <Stats />
      </div>
      <FeaturedCases />
      <HowItWorks />
      <TopPlayers />
      <PartnersTeaser />
    </>
  );
}
