// Portfolio Intelligence Dashboard — standalone route.
// Reachable at /portfolio. Protected by JARVIS middleware (same login cookie).

import { PortfolioView } from "@/components/portfolio/PortfolioView";

export const metadata = {
  title: "JARVIS · Portfolio Intelligence",
  description: "Permanent capital · billion-lives thesis tracker",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
