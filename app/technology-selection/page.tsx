import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Technology Selection - CKR Decision Platform',
  description: 'Compare platforms and tools on cost, scalability, integration, and support using 50+ decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['technology-selection']} skipLanding={sp.start === '1'} />;
}
