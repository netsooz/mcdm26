import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'RFP Scoring Tool - CKR Decision Platform',
  description: 'Score and rank RFP proposals against multiple criteria using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['rfp-scoring']} skipLanding={sp.start === '1'} />;
}
