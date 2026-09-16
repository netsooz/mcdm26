import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Investment Decision Support - CKR Decision Platform',
  description: 'Compare investment opportunities on return, risk, and liquidity using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['investment-decision']} skipLanding={sp.start === '1'} />;
}
