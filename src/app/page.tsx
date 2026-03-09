import { redirect } from "next/navigation";

export default async function LandingPage() {
  redirect("/home");

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://assets.nflxext.com/ffe/siteui/vlv3/9d3533b2-0e2b-40b2-95e4-41e9c994e9f9/web/IN-en-20241028-TRIFECTA-perspective_alpha_website_large.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%)" }} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 md:px-16 py-6">
        <span className="text-[#e50914] font-black text-3xl md:text-4xl tracking-tight">NITFLEX</span>
        <Link
          href="/sign-in"
          className="bg-[#e50914] hover:bg-[#c40712] text-white px-4 py-2 rounded font-semibold transition text-sm"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl leading-tight mb-4">
          Unlimited movies, TV shows, and more
        </h1>
        <p className="text-xl md:text-2xl mb-4 text-gray-200">
          Watch anywhere. Cancel anytime.
        </p>
        <p className="text-lg mb-8 text-gray-300">
          Ready to watch? Enter your email to create or restart your membership.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
          <input
            type="email"
            placeholder="Email address"
            className="flex-1 bg-black/50 border border-gray-500 text-white px-4 py-4 rounded focus:outline-none focus:border-white"
          />
          <Link
            href="/sign-up"
            className="bg-[#e50914] hover:bg-[#c40712] text-white px-8 py-4 rounded font-semibold text-lg transition flex items-center gap-2 justify-center whitespace-nowrap"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 border-t-8 border-[#232323] py-16 px-8 md:px-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: "📺", title: "Enjoy on your TV", desc: "Watch on Smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players, and more." },
            { icon: "📱", title: "Watch everywhere", desc: "Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV." },
            { icon: "👨‍👩‍👧", title: "Create profiles for kids", desc: "Send kids on adventures with their favorite characters in a space made just for them." },
          ].map((f) => (
            <div key={f.title} className="text-center">
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
