import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Tender Evaluation Software - CKR Decision Platform',
  description: 'Evaluate tenders systematically on price, compliance, and capability using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['tender-evaluation']} skipLanding={sp.start === '1'} />;
}
