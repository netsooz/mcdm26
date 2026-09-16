import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Contract Evaluation - CKR Decision Platform',
  description: 'Compare contracts on pricing, SLAs, liability, and flexibility using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['contract-evaluation']} skipLanding={sp.start === '1'} />;
}
