import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Sentari',
  description: 'Terms of Service for Sentari cybersecurity compliance platform.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-brand-500 hover:text-brand-600 mb-8 inline-block">
          ← Back to Sentari
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: July 2, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using Sentari (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Authorized Use Only</h2>
            <p className="text-gray-700 leading-relaxed">
              Sentari is designed for <strong>authorized security testing and compliance assessment only</strong>. You may only scan domains and infrastructure that you:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Own outright</li>
              <li>Have explicit written authorization to test</li>
              <li>Are employed by and testing as part of your job responsibilities</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              <strong>Unauthorized scanning of systems you do not own or have permission to test is illegal</strong> under the Computer Fraud and Abuse Act (US), the Computer Misuse Act (UK), the Cyber and Data Protection Act (Zimbabwe), and equivalent laws in other jurisdictions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              Sentari is provided &quot;as is&quot; for informational and compliance assessment purposes. <strong>Under no circumstances shall Sentari, its operators, or affiliates be liable for:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Any damage, disruption, or unauthorized access to systems scanned using the Platform</li>
              <li>False positives or false negatives in vulnerability detection</li>
              <li>Decisions made based on the results of a scan</li>
              <li>Any legal consequences arising from unauthorized use of the Platform</li>
              <li>Service interruptions, data loss, or platform downtime</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. WAF and Service Provider Risks</h2>
            <p className="text-gray-700 leading-relaxed">
              Sentari uses passive reconnaissance techniques (DNS lookups, HTTP header analysis, certificate transparency logs, and public OSINT data). However:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li><strong>WAF bans:</strong> Some Web Application Firewalls may flag Sentari&apos;s scanning activity. Sentari is not responsible for any IP bans, rate limiting, or service disruptions caused by your use of the Platform.</li>
              <li><strong>False positives:</strong> Our AI-powered analysis may produce false positives. Always verify findings with manual testing before making changes to production systems.</li>
              <li><strong>Third-party services:</strong> Sentari relies on third-party data sources (DNS providers, certificate transparency logs, breach databases). We do not control these services and are not responsible for their accuracy or availability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Handling</h2>
            <p className="text-gray-700 leading-relaxed">
              Scan data is stored according to your subscription tier&apos;s data retention policy. You may request deletion of your data at any time by contacting us. We do not sell or share scan data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. AI-Generated Content</h2>
            <p className="text-gray-700 leading-relaxed">
              Sentari uses artificial intelligence to analyze scan results and generate recommendations. AI-generated content:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>May contain inaccuracies or incomplete analysis</li>
              <li>Should be reviewed by a qualified security professional</li>
              <li>Does not constitute professional security advice</li>
              <li>Is provided for informational purposes only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Free Tier Limitations</h2>
            <p className="text-gray-700 leading-relaxed">
              The free tier provides limited access for evaluation purposes. Free tier users:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Receive 1 free scan per month</li>
              <li>See limited results (risk score and finding count only)</li>
              <li>Do not have access to detailed remediation or AI analysis</li>
              <li>Data is retained for 24 hours only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to terminate or suspend your access to the Platform at any time, without notice, for conduct that we determine violates these Terms or is harmful to other users or the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by the laws of the Republic of Zimbabwe. Any disputes shall be resolved in the courts of Harare, Zimbabwe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              For questions about these Terms, contact us at: <a href="mailto:legal@sentari.dev" className="text-brand-500 hover:text-brand-600">legal@sentari.dev</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-sm text-brand-500 hover:text-brand-600">
            ← Back to Sentari
          </Link>
        </div>
      </div>
    </div>
  );
}
