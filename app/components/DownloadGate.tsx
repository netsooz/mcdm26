'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

const IS_DEV = process.env.NODE_ENV === 'development';

const INDUSTRIES = [
  'Aerospace & Defense', 'Agriculture', 'Automotive', 'Banking & Finance',
  'Biotechnology', 'Chemicals', 'Construction', 'Consulting',
  'Consumer Goods', 'Education', 'Electronics', 'Energy & Utilities',
  'Engineering', 'Food & Beverage', 'Government', 'Healthcare',
  'Hospitality & Tourism', 'Information Technology', 'Insurance',
  'Legal Services', 'Logistics & Supply Chain', 'Manufacturing',
  'Media & Entertainment', 'Mining & Metals', 'Non-Profit',
  'Oil & Gas', 'Pharmaceuticals', 'Real Estate',
  'Retail & E-Commerce', 'Telecommunications', 'Transportation',
  'Other',
];

const EMPLOYEE_RANGES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000',
  '1001-5000', '5000+',
];

type ProfileType = 'business' | 'researcher';
type Step = 'loading' | 'signin' | 'profile';

interface DownloadGateProps {
  profileType: ProfileType;
  onAuthorized: () => void;
  onClose: () => void;
}

export default function DownloadGate({ profileType, onAuthorized, onClose }: DownloadGateProps) {
  const [step, setStep] = useState<Step>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Business fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [employeeRange, setEmployeeRange] = useState('');

  // Researcher fields
  const [universityName, setUniversityName] = useState('');
  const [country, setCountry] = useState('');
  const [regionState, setRegionState] = useState('');

  // Consent
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      if (data) {
        onAuthorized();
        return;
      }
      setStep('profile');
    } else {
      setStep('signin');
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleSubmitProfile() {
    if (!user) return;
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }
    if (profileType === 'business' && (!companyName.trim() || !industry || !employeeRange)) {
      setError('Please fill in all required fields.');
      return;
    }
    if (profileType === 'business' && industry === 'Other' && !customIndustry.trim()) {
      setError('Please specify your industry.');
      return;
    }
    if (profileType === 'researcher' && (!universityName.trim() || !country.trim())) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    const profileData: Record<string, unknown> = {
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      profile_type: profileType,
      marketing_consent: marketingConsent,
      terms_accepted_at: new Date().toISOString(),
    };

    if (profileType === 'business') {
      profileData.company_name = companyName.trim();
      profileData.industry = industry === 'Other' ? customIndustry.trim() : industry;
      profileData.employee_range = employeeRange;
    } else {
      profileData.university_name = universityName.trim();
      profileData.country = country.trim();
      profileData.state = regionState.trim();
    }

    const { error: insertError } = await supabase.from('profiles').insert(profileData);

    if (insertError) {
      if (insertError.code === '23505') {
        onAuthorized();
      } else {
        setError(insertError.message);
      }
    } else {
      onAuthorized();
    }
    setSubmitting(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in-fast"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-[420px] w-full overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all z-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-dark border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Step 1: Sign in */}
        {step === 'signin' && (
          <div className="p-8">
            {/* Header graphic */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-dark flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-xl text-primary-dark text-center mb-1.5">Sign in to download</h2>
            <p className="text-sm text-slate-400 text-center mb-8 max-w-[280px] mx-auto leading-relaxed">
              All analysis tools are free. Sign in once to download your reports.
            </p>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl text-sm text-primary-dark transition-all active:scale-[0.98]"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {error && (
              <p className="text-red-500 text-xs mt-4 text-center">{error}</p>
            )}

            <p className="text-[11px] text-slate-300 text-center mt-6 leading-relaxed">
              By signing in you agree to our{' '}
              <a href="/terms" target="_blank" className="text-slate-400 hover:text-accent transition-colors underline">Terms</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-slate-400 hover:text-accent transition-colors underline">Privacy Policy</a>
            </p>

            {IS_DEV && (
              <button
                onClick={onAuthorized}
                className="w-full mt-4 py-2 text-xs text-slate-300 hover:text-slate-500 border border-dashed border-slate-200 rounded-lg transition-colors"
              >
                Skip (dev only)
              </button>
            )}
          </div>
        )}

        {/* Step 2: Profile form */}
        {step === 'profile' && (
          <div>
            {/* Signed in as banner */}
            {user && (
              <div className="px-8 pt-6 pb-0">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-dark flex items-center justify-center text-white text-sm">
                      {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-primary-dark truncate">
                      {user.user_metadata?.full_name || 'Signed in'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <svg className="w-4 h-4 text-emerald-500 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            )}

            <div className="px-8 pt-5 pb-8">
              <h2 className="text-lg text-primary-dark mb-0.5">
                {profileType === 'business' ? 'About your organization' : 'About you'}
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                {profileType === 'business'
                  ? 'Help us understand who uses our tools.'
                  : 'Tell us about your research background.'}
              </p>

              <div className="space-y-3.5">
                {profileType === 'business' ? (
                  <>
                    <Field label="Company Name" required>
                      <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="gate-input"
                      />
                    </Field>
                    <Field label="Industry" required>
                      <select
                        value={industry}
                        onChange={e => setIndustry(e.target.value)}
                        className="gate-input bg-white"
                      >
                        <option value="">Select industry</option>
                        {INDUSTRIES.map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </Field>
                    {industry === 'Other' && (
                      <Field label="Specify Industry" required>
                        <input
                          type="text"
                          value={customIndustry}
                          onChange={e => setCustomIndustry(e.target.value)}
                          placeholder="e.g. Space Technology"
                          className="gate-input"
                        />
                      </Field>
                    )}
                    <Field label="Number of Employees" required>
                      <select
                        value={employeeRange}
                        onChange={e => setEmployeeRange(e.target.value)}
                        className="gate-input bg-white"
                      >
                        <option value="">Select range</option>
                        {EMPLOYEE_RANGES.map(range => (
                          <option key={range} value={range}>{range}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="University / Institution" required>
                      <input
                        type="text"
                        value={universityName}
                        onChange={e => setUniversityName(e.target.value)}
                        placeholder="e.g. MIT"
                        className="gate-input"
                      />
                    </Field>
                    <Field label="Country" required>
                      <input
                        type="text"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        placeholder="e.g. United States"
                        className="gate-input"
                      />
                    </Field>
                    <Field label="State / Province">
                      <input
                        type="text"
                        value={regionState}
                        onChange={e => setRegionState(e.target.value)}
                        placeholder="e.g. Massachusetts"
                        className="gate-input"
                      />
                    </Field>
                  </>
                )}

                {/* Divider */}
                <div className="border-t border-slate-100 pt-3.5 mt-1 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-dark focus:ring-primary-dark/20"
                    />
                    <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-accent hover:text-accent-hover underline transition-colors">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" className="text-accent hover:text-accent-hover underline transition-colors">Privacy Policy</a>
                      <span className="text-red-400 ml-0.5">*</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={e => setMarketingConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-dark focus:ring-primary-dark/20"
                    />
                    <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                      I'd like to receive product updates and decision-making insights from Chakaralaya Analytics. Unsubscribe anytime.
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleSubmitProfile}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-dark text-white hover:bg-primary-dark/90 px-5 py-3 text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Report
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 text-sm text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>

              {IS_DEV && (
                <button
                  onClick={onAuthorized}
                  className="w-full mt-3 py-2 text-xs text-slate-300 hover:text-slate-500 border border-dashed border-slate-200 rounded-lg transition-colors"
                >
                  Skip (dev only)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
