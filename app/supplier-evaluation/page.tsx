import { TOOL_CONFIGS } from '../../lib/tool-configs';
import BusinessTool from '../components/BusinessTool';

export const metadata = {
  title: 'Supplier Evaluation Software - CKR Decision Platform',
  description: 'Evaluate and rank suppliers using 50+ multi-criteria decision methods.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <BusinessTool config={TOOL_CONFIGS['supplier-evaluation']} skipLanding={sp.start === '1'} />;
}
