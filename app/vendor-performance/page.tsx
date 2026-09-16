import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Vendor Performance Management - CKR Decision Platform',
  description: 'Measure and compare vendor performance across KPIs using 50+ multi-criteria decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['vendor-performance']} skipLanding={sp.start === '1'} />;
}
