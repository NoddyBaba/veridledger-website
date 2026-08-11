import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VeridLogo } from "@/components/VeridLogo";

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
        
        <div className="space-y-8 text-slate leading-relaxed">
          <section>
            <p className="text-sm uppercase tracking-wider text-lime mb-2 font-mono">Last Updated: August 2026</p>
            <p>
              At VeridLedger, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">1. Information We Collect</h2>
            <p>
              We may collect information about you in a variety of ways, including:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and demographic information that you voluntarily give to us when you register for the platform.</li>
              <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the platform, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the site.</li>
              <li><strong>Financial Data:</strong> Data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services. (Note: Payment data is stored by our payment processor, e.g., Paystack, and we do not store full credit card numbers).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">2. Use of Your Information</h2>
            <p>
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the platform to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Create and manage your account.</li>
              <li>Process your transactions and send related information, including purchase confirmations and invoices.</li>
              <li>Verify and record Analyst picks securely to the immutable ledger.</li>
              <li>Respond to customer service requests and support needs.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">3. Disclosure of Your Information</h2>
            <p>
              We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
              <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
              <li><strong>Public Ledger (For Analysts):</strong> If you are registered as an Analyst, your locked picks, ROI, and performance metrics are published publicly as part of our core verifiable ledger offering.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">4. Data Security</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-ink mb-3">5. Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:adminveridled@gmail.com" className="text-lime hover:underline">adminveridled@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
