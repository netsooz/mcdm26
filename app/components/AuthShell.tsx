import Link from 'next/link';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_45%] bg-white">
      {/* Form side */}
      <div className="flex flex-col">
        <div className="px-6 lg:px-12 h-14 flex items-center">
          <Link href="/" className="text-sm text-[#131628] tracking-tight hover:text-[#6F00FF] transition-colors">
            CKR
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12">
          {children}
        </div>
      </div>

      {/* Brand side */}
      <div className="hidden lg:block relative bg-[#131628] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(111,0,255,0.18) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 20%, #131628 100%)' }}
        />
        <div className="relative h-full flex flex-col justify-center px-14">
          <div className="inline-flex items-center gap-2 self-start border border-[#6F00FF]/30 bg-[#6F00FF]/10 rounded-full px-3.5 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6F00FF] animate-pulse" />
            <span className="text-[11px] text-[#6F00FF]/80 uppercase tracking-widest">
              Multi-Criteria Decision Analysis
            </span>
          </div>
          <h2 className="text-3xl text-white leading-snug tracking-tight max-w-sm">
            Rank any set of options against any set of criteria — defensibly.
          </h2>
          <p className="text-sm text-[#9B9BC0] mt-5 max-w-sm leading-relaxed">
            50+ MCDM methods, cross-method consensus ranking, and export-ready
            PDF and Word reports.
          </p>
          <ul className="mt-10 space-y-3">
            {[
              '11 domain-specific decision tools',
              'TOPSIS, VIKOR, PROMETHEE, EDAS and more',
              'Sensitivity analysis across every method',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#C9C6E8]">
                <svg className="w-4 h-4 text-[#6F00FF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
