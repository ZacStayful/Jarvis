// Sales Intelligence Dashboard — standalone route.
// Reachable at /sales. Protected by JARVIS middleware (same login cookie).

import { SalesDashboard } from '@/components/sales/SalesDashboard';

export const metadata = {
  title: 'JARVIS · Sales Intelligence',
  description: 'Pipeline funnel · outreach · web meetings · special offers',
};

export default function SalesPage() {
  return <SalesDashboard />;
}
