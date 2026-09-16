export const metadata = {
  title: 'Privacy Policy - CKR Decision Platform',
  description: 'Privacy Policy for the CKR Decision Platform by Chakaralaya Analytics Private Limited.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl text-primary-dark mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-10">Last updated: 28 June 2026</p>

      <div className="space-y-8 text-sm text-slate-600 leading-relaxed">
        <Section title="1. Introduction">
          Chakaralaya Analytics Private Limited (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;) operates the CKR Decision Platform at mcdm.chakaralaya.in. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the General Data Protection Regulation (GDPR), the Information Technology Act, 2000 (India), and the Digital Personal Data Protection Act, 2023 (India).
        </Section>

        <Section title="2. Data Controller">
          <p>Chakaralaya Analytics Private Limited</p>
          <p>Email: <a href="mailto:ckranalytics@gmail.com" className="text-accent hover:text-accent-hover transition-colors">ckranalytics@gmail.com</a></p>
        </Section>

        <Section title="3. Data We Collect">
          <h3 className="text-primary-dark mt-3 mb-2">3.1 Data processed locally (not collected by us)</h3>
          <p>Decision data — criteria names, alternative names, scores, and weights — is processed entirely in your browser. This data is never transmitted to or stored on our servers.</p>

          <h3 className="text-primary-dark mt-4 mb-2">3.2 Data collected upon sign-in</h3>
          <p>When you sign in to download reports, we collect:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>From Google:</strong> Name, email address, profile picture (via Google OAuth)</li>
            <li><strong>Business users:</strong> Company name, industry, number of employees (range)</li>
            <li><strong>Researchers:</strong> University name, country, state</li>
            <li><strong>Consent records:</strong> Whether you have accepted the Terms of Service and opted in to marketing communications</li>
          </ul>
        </Section>

        <Section title="4. Legal Basis for Processing">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Contractual necessity:</strong> Processing your Google account data to authenticate and provide report downloads.</li>
            <li><strong>Legitimate interest:</strong> Collecting profile information to understand our user base and improve the Platform.</li>
            <li><strong>Consent:</strong> Sending marketing communications — only if you have explicitly opted in. You may withdraw consent at any time.</li>
          </ul>
        </Section>

        <Section title="5. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>To authenticate you and enable report downloads.</li>
            <li>To understand our user demographics (industry, company size, academic field).</li>
            <li>To send product updates and relevant content, only if you have opted in to marketing.</li>
            <li>We do not sell, rent, or share your personal data with third parties for their marketing purposes.</li>
          </ul>
        </Section>

        <Section title="6. Data Storage and Security">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Your data is stored in Supabase (backed by AWS infrastructure) with encryption at rest and in transit.</li>
            <li>Access to the database is restricted to authorized personnel only.</li>
            <li>We retain your data for as long as your account is active or as needed to provide the service.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights (GDPR)">
          <p>If you are in the European Economic Area, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate data.</li>
            <li><strong>Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;).</li>
            <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
            <li><strong>Withdraw consent:</strong> Withdraw marketing consent at any time without affecting prior processing.</li>
            <li><strong>Object:</strong> Object to processing based on legitimate interest.</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, email <a href="mailto:ckranalytics@gmail.com" className="text-accent hover:text-accent-hover transition-colors">ckranalytics@gmail.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="8. Cookies">
          The Platform uses essential cookies for authentication (session tokens). We do not use advertising or tracking cookies.
        </Section>

        <Section title="9. Third-Party Services">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Google OAuth:</strong> Used for authentication. Subject to Google&apos;s Privacy Policy.</li>
            <li><strong>Supabase:</strong> Used for authentication and data storage. Subject to Supabase&apos;s Privacy Policy.</li>
          </ul>
        </Section>

        <Section title="10. International Data Transfers">
          Your data may be transferred to and processed in countries outside your country of residence, including the United States (via Supabase/AWS). Such transfers are protected by appropriate safeguards including Standard Contractual Clauses.
        </Section>

        <Section title="11. Children">
          The Platform is not intended for use by individuals under the age of 16. We do not knowingly collect personal data from children.
        </Section>

        <Section title="12. Changes to This Policy">
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. We encourage you to review this page periodically.
        </Section>

        <Section title="13. Contact">
          For questions or concerns about this Privacy Policy, contact us at{' '}
          <a href="mailto:ckranalytics@gmail.com" className="text-accent hover:text-accent-hover transition-colors">
            ckranalytics@gmail.com
          </a>.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base text-primary-dark mb-3">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
