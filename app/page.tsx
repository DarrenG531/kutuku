import Link from "next/link";
import {
  Users,
  CheckCircle,
  Bell,
  TrendingUp,
  ArrowRight,
  Shield,
  Smartphone,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-lg text-slate-900">Kutuku</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/auth?mode=signup"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
            <span>🇲🇾</span>
            <span>Built for Malaysians</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6">
            Kutu dengan kawan,{" "}
            <span className="text-emerald-500">tanpa drama</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
            Manage your group savings the smart way. No more WhatsApp arguments,
            missed payments, or confusion about whose turn it is to collect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth?mode=signup"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Start Your Kutu Group
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Log In
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-4">Free to get started • No credit card needed</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            How Kutuku works
          </h2>
          <p className="text-slate-500 text-center mb-14 max-w-xl mx-auto">
            Same kutu you know and trust — now organised, transparent and
            drama-free.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: Users,
                title: "Create your group",
                desc: "Set your monthly contribution amount, number of members, and start date. Share the invite link on WhatsApp.",
              },
              {
                step: "2",
                icon: CheckCircle,
                title: "Track every payment",
                desc: "Members confirm payments via DuitNow or bank transfer. Everyone can see who has paid and who hasn't.",
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Know your turn",
                desc: "Clear schedule shows exactly whose month it is to collect, and how much they're getting.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-emerald-600" />
                </div>
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-1">
                  Step {step}
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-14">
            Everything your kutu group needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Bell,
                title: "Payment Reminders",
                desc: "Automatic reminders so you never have to awkwardly chase people yourself.",
              },
              {
                icon: Shield,
                title: "Transparent Records",
                desc: "Full payment history visible to all members. No disputes, no missing money.",
              },
              {
                icon: Users,
                title: "Easy Invites",
                desc: "Share a single link via WhatsApp and your friends join in seconds.",
              },
              {
                icon: TrendingUp,
                title: "Payout Schedule",
                desc: "Clear month-by-month view of who collects when, from start to finish.",
              },
              {
                icon: CheckCircle,
                title: "Payment Confirmation",
                desc: "Members mark payments as done with method and reference — admin confirms.",
              },
              {
                icon: Smartphone,
                title: "Works on Any Device",
                desc: "Access your kutu dashboard from phone or laptop, anytime.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-500 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start your kutu group?
          </h2>
          <p className="text-emerald-100 mb-8 text-lg">
            Join thousands of Malaysians managing their savings the modern way.
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
          >
            Create a Free Group
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="text-white font-semibold">Kutuku</span>
          </div>
          <p className="text-sm">© 2026 Kutuku. Made with ❤️ in Malaysia.</p>
        </div>
      </footer>
    </div>
  );
}
