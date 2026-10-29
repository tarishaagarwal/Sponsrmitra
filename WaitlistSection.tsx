import React, { useState, useEffect } from 'react';
import { PushPin } from './PushPin';
import { TapeStrip } from './TapeStrip';
import {
  googleSignIn,
  getAccessToken,
  initAuth,
  logout,
} from '../services/authService';
import {
  appendWaitlistEntry,
  getStoredSheetInfo,
  getOrCreateWaitlistSheet,
  clearStoredSheetInfo,
  WaitlistEntry,
} from '../services/sheetsService';
import { CheckCircle2, AlertTriangle, ExternalLink, Loader2, Table, RefreshCw } from 'lucide-react';
import type { User } from 'firebase/auth';

interface WaitlistSectionProps {
  selectedRole: 'Organiser' | 'Sponsor';
  onChangeRole: (role: 'Organiser' | 'Sponsor') => void;
}

export const WaitlistSection: React.FC<WaitlistSectionProps> = ({
  selectedRole,
  onChangeRole,
}) => {
  // Form field states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [collegeOrCompany, setCollegeOrCompany] = useState('');
  const [role, setRole] = useState<'Organiser' | 'Sponsor'>(selectedRole);

  // Auth & Sheets status states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  // Submission lifecycle states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<WaitlistEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnectingSheet, setIsConnectingSheet] = useState(false);

  // Sync selectedRole prop from parent if changed externally
  useEffect(() => {
    setRole(selectedRole);
  }, [selectedRole]);

  // Check stored sheet info and init Firebase auth listener
  useEffect(() => {
    const stored = getStoredSheetInfo();
    if (stored.id) setSheetId(stored.id);
    if (stored.url) setSheetUrl(stored.url);

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
        if (user.displayName && !name) setName(user.displayName);
        if (user.email && !email) setEmail(user.email);
      },
      () => {
        setCurrentUser(null);
        setHasToken(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Connect Google account & ensure Google Sheet is provisioned
  const handleConnectGoogle = async () => {
    setIsConnectingSheet(true);
    setErrorMessage(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setCurrentUser(user);
      setHasToken(true);
      if (user.displayName && !name) setName(user.displayName);
      if (user.email && !email) setEmail(user.email);

      // Verify or create sheet
      const sheet = await getOrCreateWaitlistSheet(accessToken);
      setSheetId(sheet.spreadsheetId);
      setSheetUrl(sheet.spreadsheetUrl);
    } catch (err: any) {
      console.error('Google connect error:', err);
      setErrorMessage(
        err.message || 'Could not connect to Google Account. Please try again.'
      );
    } finally {
      setIsConnectingSheet(false);
    }
  };

  // Disconnect / switch account
  const handleDisconnect = async () => {
    await logout();
    setCurrentUser(null);
    setHasToken(false);
    clearStoredSheetInfo();
    setSheetId(null);
    setSheetUrl(null);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate fields
    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!collegeOrCompany.trim()) {
      setErrorMessage('Please enter your college or company name.');
      return;
    }
    if (!role) {
      setErrorMessage('Please select whether you are joining as an Organiser or Sponsor.');
      return;
    }

    setIsSubmitting(true);

    try {
      let token = getAccessToken();

      // If no valid access token in memory, trigger Google Sign-In popup
      if (!token) {
        const authResult = await googleSignIn();
        token = authResult.accessToken;
        setCurrentUser(authResult.user);
        setHasToken(true);
      }

      // Append row to Google Sheet
      const entry: WaitlistEntry = {
        name: name.trim(),
        email: email.trim(),
        collegeOrCompany: collegeOrCompany.trim(),
        role,
      };

      const result = await appendWaitlistEntry(token, entry);
      setSheetUrl(result.spreadsheetUrl);
      const stored = getStoredSheetInfo();
      if (stored.id) setSheetId(stored.id);

      setSubmittedData(entry);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Submission failed:', err);
      // Keep user input completely intact!
      setErrorMessage(
        err.message ||
          'Failed to record your entry in the Google Sheet. Please verify your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setIsSubmitted(false);
    setName('');
    setEmail('');
    setCollegeOrCompany('');
    setErrorMessage(null);
  };

  return (
    <section id="waitlist" className="py-20 px-4 sm:px-6 relative scroll-mt-10">
      <div className="max-w-3xl mx-auto">
        {/* Section Heading & Text */}
        <div className="text-center mb-10">
          <div className="inline-block mb-3 border-b-2 border-[#A83A2D] dark:border-[#C44B3D] pb-1">
            <span className="font-heading text-xs uppercase tracking-wider font-semibold text-[#A83A2D] dark:text-[#C44B3D]">
              EARLY ACCESS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] tracking-tight mb-4">
            Be first on the list
          </h2>
          <p className="text-lg font-serif text-[#4A4436] dark:text-[#B8B0A0] max-w-xl mx-auto leading-relaxed">
            SponsrMitra is opening first in India. Join the waitlist and
            we&apos;ll let you know the moment it&apos;s live — free during early
            access.
          </p>
        </div>

        {/* Noticeboard Waitlist Form Card */}
        <div className="relative">
          {/* Top Tape and Pushpins */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
            <TapeStrip width="w-32" rotation="-rotate-1" variant="brick" />
          </div>
          <div className="absolute -top-3 left-10 z-20">
            <PushPin color="brick" size="md" />
          </div>
          <div className="absolute -top-3 right-10 z-20">
            <PushPin color="teal" size="md" />
          </div>

          <div className="bg-[#FBF6EA] dark:bg-[#272420] border-2 border-[#221F1A]/20 dark:border-[#EDE6D8]/20 p-6 sm:p-10 md:p-12 shadow-[4px_6px_24px_rgba(34,31,26,0.12)] dark:shadow-[4px_6px_24px_rgba(0,0,0,0.55)]">
            {/* Google Sheets Integration Status Bar */}
            <div className="mb-8 p-3.5 bg-[#E7DCC3]/50 dark:bg-[#1B1916]/60 border border-[#221F1A]/15 dark:border-[#EDE6D8]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-heading">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-[#1F5C56] dark:text-[#37958C] shrink-0" />
                <div>
                  <span className="font-semibold text-[#221F1A] dark:text-[#EDE6D8]">
                    Google Sheets Sync:
                  </span>{' '}
                  <span className="text-[#4A4436] dark:text-[#B8B0A0]">
                    {sheetId
                      ? 'Live Sheet Active (Timestamp, Name, Email, College/Company, Role)'
                      : 'Automatic Google Sheet connection ready'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {sheetUrl ? (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#1F5C56] dark:text-[#37958C] hover:underline font-semibold"
                  >
                    <span>View Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isConnectingSheet}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[#FBF6EA] dark:bg-[#272420] border border-[#221F1A]/20 dark:border-[#EDE6D8]/20 hover:bg-[#E7DCC3]/80 transition-colors cursor-pointer text-[#221F1A] dark:text-[#EDE6D8]"
                  >
                    {isConnectingSheet ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>{hasToken ? 'Sheet Ready' : 'Connect Google'}</span>
                  </button>
                )}

                {currentUser && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[#A83A2D] dark:text-[#C44B3D] text-[11px] hover:underline ml-1 cursor-pointer"
                    title="Sign out of Google"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>

            {/* Error Message Alert (without losing input) */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-[#A83A2D]/10 dark:bg-[#C44B3D]/15 border-l-4 border-[#A83A2D] dark:border-[#C44B3D] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#A83A2D] dark:text-[#C44B3D] shrink-0 mt-0.5" />
                <div className="text-sm font-serif text-[#221F1A] dark:text-[#EDE6D8]">
                  <p className="font-heading font-semibold text-[#A83A2D] dark:text-[#C44B3D] mb-0.5">
                    Submission Error
                  </p>
                  <p>{errorMessage}</p>
                  <p className="text-xs text-[#4A4436] dark:text-[#B8B0A0] mt-1 font-heading">
                    Don&apos;t worry — your entered information has been kept intact above.
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation State or Form */}
            {isSubmitted ? (
              /* Success Confirmation Message (Replaces form) */
              <div className="py-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#1F5C56]/15 dark:bg-[#2D7D75]/25 flex items-center justify-center text-[#1F5C56] dark:text-[#37958C]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold font-heading text-[#221F1A] dark:text-[#EDE6D8] mb-3">
                  You&apos;re on the list.
                </h3>

                <p className="text-lg font-serif text-[#4A4436] dark:text-[#B8B0A0] max-w-md mx-auto mb-8 leading-relaxed">
                  We&apos;ll email you the moment SponsrMitra opens.
                </p>

                {/* Stamped Receipt ticket */}
                <div className="max-w-md mx-auto bg-[#E7DCC3]/60 dark:bg-[#1B1916]/70 border border-dashed border-[#221F1A]/30 dark:border-[#EDE6D8]/30 p-5 mb-8 text-left text-sm font-serif">
                  <div className="flex justify-between items-center border-b border-[#221F1A]/15 pb-2 mb-3">
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#A83A2D] dark:text-[#C44B3D]">
                      SAVED TO GOOGLE SHEET
                    </span>
                    <span className="text-xs font-mono text-[#4A4436]/60 dark:text-[#B8B0A0]/60">
                      {new Date().toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <p>
                      <strong className="font-heading font-semibold">Name:</strong>{' '}
                      {submittedData?.name}
                    </p>
                    <p>
                      <strong className="font-heading font-semibold">Email:</strong>{' '}
                      {submittedData?.email}
                    </p>
                    <p>
                      <strong className="font-heading font-semibold">College / Org:</strong>{' '}
                      {submittedData?.collegeOrCompany}
                    </p>
                    <p>
                      <strong className="font-heading font-semibold">Role:</strong>{' '}
                      <span className="inline-block px-1.5 py-0.5 bg-[#D9761C]/15 text-[#D9761C] font-semibold text-xs">
                        {submittedData?.role}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {sheetUrl && (
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-heading font-semibold text-sm px-6 py-3 bg-[#1F5C56] hover:bg-[#174843] text-[#FBF6EA] border border-[#221F1A]/20 transition-all shadow-sm"
                    >
                      <Table className="w-4 h-4" />
                      <span>Open in Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleResetForAnother}
                    className="w-full sm:w-auto font-heading font-medium text-sm px-5 py-3 border border-[#221F1A]/25 dark:border-[#EDE6D8]/20 bg-[#FBF6EA] dark:bg-[#272420] hover:bg-[#E7DCC3]/60 transition-colors text-[#221F1A] dark:text-[#EDE6D8] cursor-pointer"
                  >
                    Submit another response
                  </button>
                </div>
              </div>
            ) : (
              /* The Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Field 1: Name */}
                <div>
                  <label
                    htmlFor="waitlist-name"
                    className="block font-heading font-semibold text-sm text-[#221F1A] dark:text-[#EDE6D8] mb-2"
                  >
                    Name <span className="text-[#A83A2D]">*</span>
                  </label>
                  <input
                    id="waitlist-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-4 py-3 bg-[#FBF6EA] dark:bg-[#1B1916] border border-[#221F1A]/25 dark:border-[#EDE6D8]/25 font-serif text-base text-[#221F1A] dark:text-[#EDE6D8] placeholder-[#4A4436]/40 dark:placeholder-[#B8B0A0]/40 transition-colors shadow-inner"
                  />
                </div>

                {/* Field 2: Email */}
                <div>
                  <label
                    htmlFor="waitlist-email"
                    className="block font-heading font-semibold text-sm text-[#221F1A] dark:text-[#EDE6D8] mb-2"
                  >
                    Email <span className="text-[#A83A2D]">*</span>
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aarav@college.edu or brand@company.com"
                    className="w-full px-4 py-3 bg-[#FBF6EA] dark:bg-[#1B1916] border border-[#221F1A]/25 dark:border-[#EDE6D8]/25 font-serif text-base text-[#221F1A] dark:text-[#EDE6D8] placeholder-[#4A4436]/40 dark:placeholder-[#B8B0A0]/40 transition-colors shadow-inner"
                  />
                </div>

                {/* Field 3: College or company name */}
                <div>
                  <label
                    htmlFor="waitlist-org"
                    className="block font-heading font-semibold text-sm text-[#221F1A] dark:text-[#EDE6D8] mb-2"
                  >
                    College or company name <span className="text-[#A83A2D]">*</span>
                  </label>
                  <input
                    id="waitlist-org"
                    type="text"
                    required
                    value={collegeOrCompany}
                    onChange={(e) => setCollegeOrCompany(e.target.value)}
                    placeholder="e.g. BITS Pilani or Red Bull India"
                    className="w-full px-4 py-3 bg-[#FBF6EA] dark:bg-[#1B1916] border border-[#221F1A]/25 dark:border-[#EDE6D8]/25 font-serif text-base text-[#221F1A] dark:text-[#EDE6D8] placeholder-[#4A4436]/40 dark:placeholder-[#B8B0A0]/40 transition-colors shadow-inner"
                  />
                </div>

                {/* Field 4: I'm joining as */}
                <div>
                  <label
                    htmlFor="waitlist-role"
                    className="block font-heading font-semibold text-sm text-[#221F1A] dark:text-[#EDE6D8] mb-2"
                  >
                    I&apos;m joining as <span className="text-[#A83A2D]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="waitlist-role"
                      required
                      value={role}
                      onChange={(e) => {
                        const val = e.target.value as 'Organiser' | 'Sponsor';
                        setRole(val);
                        onChangeRole(val);
                      }}
                      className="w-full px-4 py-3 bg-[#FBF6EA] dark:bg-[#1B1916] border border-[#221F1A]/25 dark:border-[#EDE6D8]/25 font-serif text-base text-[#221F1A] dark:text-[#EDE6D8] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="Organiser" className="bg-[#FBF6EA] dark:bg-[#272420]">
                        Organiser (College Fest Team)
                      </option>
                      <option value="Sponsor" className="bg-[#FBF6EA] dark:bg-[#272420]">
                        Sponsor (Brand / Company)
                      </option>
                    </select>
                    {/* Noticeboard selector caret */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#4A4436] dark:text-[#B8B0A0]">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Submit Button - strictly no arrow icon */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-heading font-bold text-base py-4 px-6 bg-[#D9761C] hover:bg-[#BF6513] text-[#FBF6EA] border border-[#221F1A]/25 dark:border-[#EDE6D8]/20 shadow-[3px_3px_0_rgba(34,31,26,0.2)] dark:shadow-[3px_3px_0_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all text-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Appending to Google Sheet...</span>
                      </>
                    ) : (
                      <span>Join the waitlist</span>
                    )}
                  </button>
                  <p className="text-center text-xs font-serif text-[#4A4436]/70 dark:text-[#B8B0A0]/70 mt-3">
                    Submissions sync automatically to your Google Sheets waitlist.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
