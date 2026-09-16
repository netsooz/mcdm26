import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Risk Assessment - CKR Decision Platform',
  description: 'Prioritize risks by impact, likelihood, detectability, and mitigation cost using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['risk-assessment']} skipLanding={sp.start === '1'} />;
}
