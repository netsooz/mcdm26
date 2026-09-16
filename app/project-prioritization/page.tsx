import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Project Prioritization - CKR Decision Platform',
  description: 'Rank projects by impact, feasibility, and urgency using 50+ multi-criteria decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['project-prioritization']} skipLanding={sp.start === '1'} />;
}
