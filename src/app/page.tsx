"use client";

import { MobileAppPrompt } from "@/app/landing/LandingShared";
import {
  LandingCtaSection,
  LandingFooter,
  LandingHero,
  LandingHowItWorksSection,
  LandingIndustriesSection,
  LandingModulesSection,
  LandingNav,
  LandingPricingSection,
  LandingStatsSection,
} from "@/app/landing/LandingSections";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MobileAppPrompt />
      <LandingNav />
      <LandingHero />
      <LandingStatsSection />
      <LandingHowItWorksSection />
      <LandingModulesSection />
      <LandingPricingSection />
      <LandingIndustriesSection />
      <LandingCtaSection />
      <LandingFooter />
    </div>
  );
}
