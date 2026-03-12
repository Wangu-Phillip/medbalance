import { useEffect, useRef } from "react";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth scroll behavior
    const handleSmoothScroll = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (
        target.hasAttribute("href") &&
        target.getAttribute("href")?.startsWith("#")
      ) {
        e.preventDefault();
        const id = target.getAttribute("href")?.substring(1);
        const element = document.getElementById(id || "");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", handleSmoothScroll);
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-5");
        }
      });
    }, observerOptions);

    document.querySelectorAll("[data-animate]").forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full backdrop-blur-md bg-slate-900/80 border-b border-cyan-500/10 z-50 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
            MedBalance
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a
              href="#hero"
              className="text-slate-100 hover:text-cyan-400 transition-colors relative group"
            >
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a
              href="#features"
              className="text-slate-100 hover:text-cyan-400 transition-colors relative group"
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a
              href="#how-it-works"
              className="text-slate-100 hover:text-cyan-400 transition-colors relative group"
            >
              How It Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a
              href="#about-us"
              className="text-slate-100 hover:text-cyan-400 transition-colors relative group"
            >
              About Us
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a
              href="#contact"
              className="text-slate-100 hover:text-cyan-400 transition-colors relative group"
            >
              Contact Us
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <button className="text-slate-100 border border-cyan-500 hover:text-cyan-400 transition-colors px-6 py-2 rounded-lg hover:bg-cyan-500/10">
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden"
      >
        {/* Animated background elements */}
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animation: "float 20s ease-in-out infinite" }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animation: "float 25s ease-in-out infinite reverse" }}
        ></div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(-20px) translateX(20px); }
            50% { transform: translateY(-40px) translateX(0px); }
            75% { transform: translateY(-20px) translateX(-20px); }
          }
        `}</style>

        {/* Hero Content */}
        <div className="max-w-4xl text-center z-10 animate-in fade-in slide-in-from-bottom-6 duration-800">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Fair Medicine Distribution,{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
            Internal system for government hospitals and healthcare
            administrators. Optimize medicine allocation across your facilities
            with intelligent demand forecasting and equitable resource
            distribution.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div
              className="p-6 rounded-xl border border-cyan-500/20 bg-slate-800/50 backdrop-blur-lg opacity-0 translate-y-5 transition-all duration-600"
              data-animate
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                92%
              </div>
              <div className="text-slate-400 text-sm">Accuracy Rate</div>
            </div>
            <div
              className="p-6 rounded-xl border border-cyan-500/20 bg-slate-800/50 backdrop-blur-lg opacity-0 translate-y-5 transition-all duration-600"
              data-animate
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-slate-400 text-sm">Facilities Served</div>
            </div>
            <div
              className="p-6 rounded-xl border border-cyan-500/20 bg-slate-800/50 backdrop-blur-lg opacity-0 translate-y-5 transition-all duration-600"
              data-animate
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                40%
              </div>
              <div className="text-slate-400 text-sm">Cost Reduction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative py-24 px-4 bg-gradient-to-b from-cyan-500/5 to-transparent"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-20 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-slate-400">
              Designed for government hospitals. Everything you need to optimize
              medicine distribution and forecasting in one intelligent platform.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "01",
                title: "Advanced Forecasting",
                desc: "Machine learning models predict medicine demand with exceptional accuracy, accounting for seasonal trends and health crises.",
              },
              {
                icon: "02",
                title: "Fair Allocation",
                desc: "Intelligent algorithms ensure equitable distribution of medicines across all healthcare facilities based on population needs.",
              },
              {
                icon: "03",
                title: "Real-time Analytics",
                desc: "Monitor key metrics, track allocation efficiency, and gain insights into medicine utilization patterns in real-time.",
              },
              {
                icon: "04",
                title: "Secure & Compliant",
                desc: "Enterprise-grade security with HIPAA compliance ensures your healthcare data remains protected at all times.",
              },
              {
                icon: "05",
                title: "Multi-facility Support",
                desc: "Manage and optimize medicine distribution across multiple healthcare facilities from a single centralized platform.",
              },
              {
                icon: "06",
                title: "Instant Insights",
                desc: "Get actionable recommendations and alerts to prevent stockouts and minimize waste across your distribution network.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="relative p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl hover:border-cyan-400 hover:-translate-y-2 transition-all duration-300 opacity-0 translate-y-5"
                data-animate
                style={{ transitionDelay: `${idx * 50}ms` }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-cyan-400 mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-slate-50">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-20 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-400">
              A simple yet powerful workflow to optimize your medicine
              distribution.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                num: 1,
                title: "Upload Data",
                desc: "Upload historical medicine consumption and facility data to our secure platform.",
              },
              {
                num: 2,
                title: "AI Forecasting",
                desc: "Our machine learning models analyze patterns and predict future demand with high accuracy.",
              },
              {
                num: 3,
                title: "Smart Allocation",
                desc: "Receive optimized allocation recommendations ensuring fair and efficient distribution.",
              },
              {
                num: 4,
                title: "Track & Optimize",
                desc: "Monitor metrics in real-time and continuously improve distribution strategies.",
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="text-center opacity-0 translate-y-5 transition-all duration-600"
                data-animate
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 flex items-center justify-center text-2xl font-bold text-slate-900 mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-slate-50">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section
        id="contact"
        className="py-24 px-4 bg-gradient-to-r from-cyan-500/10 to-emerald-500/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Need Assistance?
            </h2>
            <p className="text-lg text-slate-400">
              Our team is here to support government hospital implementation and
              optimization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border border-cyan-500/20 bg-slate-800/50 backdrop-blur-lg text-center">
              <h3 className="text-xl font-semibold text-slate-50 mb-3">
                Documentation
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Comprehensive guides and best practices for system usage and
                optimization
              </p>
              <a
                href="#"
                className="inline-block text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View Docs →
              </a>
            </div>

            <div className="p-8 rounded-xl border border-cyan-500/20 bg-slate-800/50 backdrop-blur-lg text-center">
              <h3 className="text-xl font-semibold text-slate-50 mb-3">
                Support Portal
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Submit issues, track requests, and access technical support
                resources
              </p>
              <a
                href="#"
                className="inline-block text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Open Portal →
              </a>
            </div>

            <div className="p-8 rounded-xl border border-cyan-500/20 bg-slate-800/50 backdrop-blur-lg text-center">
              <h3 className="text-xl font-semibold text-slate-50 mb-3">
                Training
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Access training materials and schedules for your organization
              </p>
              <a
                href="#"
                className="inline-block text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Learn More →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-cyan-500/10 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-slate-50 font-semibold mb-3">
                MedBalance AI
              </h3>
              <p className="text-slate-400 text-sm">
                Internal system for government hospitals. Intelligent medicine
                distribution for better healthcare outcomes.
              </p>
            </div>
            <div>
              <h3 className="text-slate-50 font-semibold mb-3">Resources</h3>
              <ul className="space-y-2">
                {[
                  "Documentation",
                  "Support Portal",
                  "Training Guides",
                  "System Status",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-slate-50 font-semibold mb-3">Legal</h3>
              <ul className="space-y-2">
                {[
                  "Privacy Policy",
                  "Terms of Service",
                  "Compliance",
                  "Data Protection",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-cyan-500/10 pt-8 sm:flex-row items-center gap-4">
            <p className="text-slate-400 text-sm text-center">
              &copy; 2026 MedBalance AI. For authorized government hospital use
              only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
