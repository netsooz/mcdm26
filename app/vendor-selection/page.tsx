import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Vendor Selection Platform - CKR Decision Platform',
  description: 'Select the best vendor by comparing capabilities, costs, and experience using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['vendor-selection']} skipLanding={sp.start === '1'} />;
}
