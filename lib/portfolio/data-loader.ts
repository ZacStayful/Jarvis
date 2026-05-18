// Server-side loaders for the static portfolio JSON files.
// Components import these (not the JSON directly) so the consumer surface stays stable.

import type {
  HoldingData,
  PortfolioMeta,
  DevelopmentsData,
  RiskTriggersFile,
} from './types';

import portfolioMeta from '@/portfolio/data/portfolio-meta.json';
import developments from '@/portfolio/data/developments.json';
import riskTriggers from '@/portfolio/data/risk-triggers.json';
import tesla from '@/portfolio/data/holdings/tesla.json';
import google from '@/portfolio/data/holdings/google.json';
import sp500 from '@/portfolio/data/holdings/sp500.json';
import spacex from '@/portfolio/data/holdings/spacex.json';

export function loadPortfolioMeta(): PortfolioMeta {
  return portfolioMeta as PortfolioMeta;
}

export function loadDevelopments(): DevelopmentsData {
  return developments as DevelopmentsData;
}

export function loadRiskTriggers(): RiskTriggersFile {
  return riskTriggers as RiskTriggersFile;
}

export function loadHoldings(): HoldingData[] {
  return [tesla, google, sp500, spacex] as HoldingData[];
}

export function loadHoldingByTicker(ticker: string): HoldingData | undefined {
  return loadHoldings().find(
    h => h.ticker.toLowerCase() === ticker.toLowerCase()
  );
}
