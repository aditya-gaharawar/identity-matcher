"use client";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white-pattern">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-between pb-10 md:pb-20">
        <div className="flex justify-between items-center pt-20 md:pt-32 container mx-auto px-4 md:px-16 ">
          <Link href="/">
            <Image
              className="cursor-pointer"
              src="https://code.webspaceai.in/lovable-uploads/b5556be9-1da8-4fdb-a6b9-969b73491798.png"
              width={250}
              height={250}
              alt="Identity Matcher Logo"
            />
          </Link>
        </div>
        <div className="container mx-auto px-4 md:px-16">
          <div className="pt-10 md:pt-20">
            {/* Main Content */}
            <div className="space-y-4 md:space-y-6 mb-10 md:mb-16">
              <h1 className="font-funnel-display text-3xl md:text-5xl lg:text-7xl font-bold text-black max-w-4xl">
                AI-Powered Identity Verification
              </h1>
              <p className="font-funnel-display text-lg md:text-xl text-gray-500">
                Blockchain-secured identity matching with advanced facial recognition.
              </p>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="container mx-auto px-4 md:px-16">
          <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 pt-6 md:pt-8 gap-4 md:gap-0">
            <div className="flex items-center gap-2">
              <span className="font-funnel-display text-gray-900">
                Secure Identity Verification Platform
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-0 w-full md:w-auto">
              <Link href="/admin" className="w-full md:w-[200px]">
                <div className="w-full md:w-[200px] py-3 text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center font-funnel-display">
                  Admin Panel
                </div>
              </Link>
              <Link href="/verify" className="w-full md:w-[200px]">
                <div className="w-full md:w-[200px] py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-center font-funnel-display">
                  Verify Identity
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
