import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VeridLogo } from "@/components/VeridLogo";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-obsidian text-ink selection:bg-lime/30">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-slate hover:text-ink transition-colors mb-12">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-lime/10 text-lime">
            <VeridLogo className="h-6 w-6 fill-current" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        </div>
        
        <div className="space-y-8 text-slate leading-relaxed">
          <section>
            <p className="text-sm uppercase tracking-wider text-lime mb-2 font-mono">Last Updated: August 2026</p>
            <p>
              Welcome to VeridLedger. By accessing our platform, you agree to these Terms of Service. Please read them carefully. VeridLedger provides a verifiable sports analytics platform designed to create immutable track records for analysts and allocators.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using VeridLedger ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">2. User Accounts & Roles</h2>
            <p>
              Users may register as <strong>Analysts</strong> or <strong>Allocators</strong>. Analysts provide sports picks which are permanently recorded on our cryptographic ledger. Allocators consume these insights. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">3. Immutable Ledger & Data Integrity</h2>
            <p>
              The core premise of VeridLedger is absolute truth. Once an Analyst locks a pick, it is permanently written to the database. It cannot be altered, deleted, or manipulated. You acknowledge that performance data, ROI, and win rates are calculated autonomously and represent an immutable public record of your performance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">4. Not Financial or Betting Advice</h2>
            <p>
              VeridLedger is a data verification and analytics platform. We do not facilitate gambling, nor do we provide financial or betting advice. The signals and picks provided by Analysts are for informational purposes only. Allocators are solely responsible for how they use this information. Allocate responsibly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">5. Subscriptions & Payments</h2>
            <p>
              Access to certain Analysts' feeds may require a subscription. Payments are processed securely via our third-party payment provider. Subscriptions automatically renew unless canceled prior to the renewal date. All fees are non-refundable except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Platform, us, or third parties, or for any other reason.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">7. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at <a href="mailto:adminveridled@gmail.com" className="text-lime hover:underline">adminveridled@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
