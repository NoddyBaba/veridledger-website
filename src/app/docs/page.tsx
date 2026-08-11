import { ArrowLeft, Terminal, Code2, Database } from "lucide-react";
import Link from "next/link";
import { VeridLogo } from "@/components/VeridLogo";

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-obsidian text-ink selection:bg-lime/30 pb-20">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-slate hover:text-ink transition-colors mb-12">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-lime/10 text-lime">
            <VeridLogo className="h-6 w-6 fill-current" />
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">API Documentation</h1>
        </div>
        <p className="text-slate text-lg mb-12 border-b border-obsidian-line pb-8">
          The VeridLedger API allows developers and allocators to programmatically access verified sports data, analyst performance ledgers, and live odds. Build your own models on top of our immutable infrastructure.
        </p>
        
        <div className="space-y-12 text-slate leading-relaxed">
          
          {/* Section 1: Authentication */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="text-lime" size={20} />
              <h2 className="text-2xl font-semibold text-ink">Authentication</h2>
            </div>
            <p className="mb-4">
              All API requests require a valid API key. You can generate an API key from your dashboard once you have an active Developer subscription.
              Authenticate your requests by including the key in the <code className="text-lime bg-lime/10 px-1.5 py-0.5 rounded text-sm font-mono">Authorization</code> header.
            </p>
            <div className="bg-obsidian-raised border border-obsidian-line p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <span className="text-slate">Authorization: Bearer </span>
              <span className="text-ink">vl_live_123abc456def...</span>
            </div>
          </section>

          {/* Section 2: Core Endpoints */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="text-lime" size={20} />
              <h2 className="text-2xl font-semibold text-ink">Core Endpoints</h2>
            </div>
            <p className="mb-6">
              Our REST API is designed around predictable, resource-oriented URLs. Below are the primary endpoints available in the v1 API.
            </p>
            
            <div className="space-y-6">
              {/* Endpoint 1 */}
              <div className="border border-obsidian-line rounded-lg overflow-hidden">
                <div className="bg-obsidian-raised px-4 py-3 flex items-center gap-3 border-b border-obsidian-line">
                  <span className="bg-secondary/20 text-secondary font-mono text-xs font-bold px-2 py-1 rounded">GET</span>
                  <code className="font-mono text-sm text-ink">/v1/analysts</code>
                </div>
                <div className="p-4 bg-obsidian">
                  <p className="text-sm">Returns a paginated list of all verified analysts on the platform, including their lifetime ROI, total picks, and current win rate.</p>
                </div>
              </div>

              {/* Endpoint 2 */}
              <div className="border border-obsidian-line rounded-lg overflow-hidden">
                <div className="bg-obsidian-raised px-4 py-3 flex items-center gap-3 border-b border-obsidian-line">
                  <span className="bg-secondary/20 text-secondary font-mono text-xs font-bold px-2 py-1 rounded">GET</span>
                  <code className="font-mono text-sm text-ink">/v1/picks/live</code>
                </div>
                <div className="p-4 bg-obsidian">
                  <p className="text-sm">Fetches all currently locked, unsettled picks from the analysts you are subscribed to. Returns odds, stake size, and timestamp data.</p>
                </div>
              </div>

              {/* Endpoint 3 */}
              <div className="border border-obsidian-line rounded-lg overflow-hidden">
                <div className="bg-obsidian-raised px-4 py-3 flex items-center gap-3 border-b border-obsidian-line">
                  <span className="bg-emerald-500/20 text-emerald-500 font-mono text-xs font-bold px-2 py-1 rounded">POST</span>
                  <code className="font-mono text-sm text-ink">/v1/webhooks/register</code>
                </div>
                <div className="p-4 bg-obsidian">
                  <p className="text-sm">Register a webhook URL to receive real-time POST events whenever a subscribed analyst locks in a new pick or a game settles.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Rate Limits & Support */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="text-lime" size={20} />
              <h2 className="text-2xl font-semibold text-ink">Rate Limits</h2>
            </div>
            <p>
              To ensure stability and fair use, API requests are subject to rate limiting based on your subscription tier. The standard limit is <strong className="text-ink">100 requests per minute</strong> per API key.
            </p>
            <p className="mt-4">
              If you exceed this limit, the API will return a <code className="text-lime bg-lime/10 px-1.5 py-0.5 rounded text-sm font-mono">429 Too Many Requests</code> response. For higher throughput requirements, please <a href="mailto:adminveridled@gmail.com" className="text-lime hover:underline">contact our team</a> to discuss enterprise infrastructure.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
