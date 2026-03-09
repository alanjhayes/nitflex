import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 z-10" />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://assets.nflxext.com/ffe/siteui/vlv3/9d3533b2-0e2b-40b2-95e4-41e9c994e9f9/web/IN-en-20241028-TRIFECTA-perspective_alpha_website_large.jpg')" }}
      />
      <div className="relative z-20 w-full px-4 flex flex-col items-center">
        <div className="w-full max-w-md mb-8">
          <span className="text-[#e50914] font-black text-4xl tracking-tight">NITFLEX</span>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
