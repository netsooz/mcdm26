import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'CAPEX Approval System - CKR Decision Platform',
  description: 'Prioritize capital expenditure projects by ROI, risk, and strategic fit using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['capex-approval']} skipLanding={sp.start === '1'} />;
}
