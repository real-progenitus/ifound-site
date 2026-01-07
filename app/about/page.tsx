export default function About() {
  return (
    <div className="min-h-screen bg-[#38B6FF] flex items-center justify-center min-[400px]:p-0 font-sans transition-all duration-500 ease-in-out">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-6 pt-6 min-[400px]:hidden">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/logopin.png"
              alt="Logo"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <span className="text-white text-2xl font-semibold">ifound</span>
          </a>

          {/* Navigation links */}
          <div className="flex items-center gap-4">
            <a href="/" className="text-white text-sm font-medium hover:text-white/80 transition-colors">Home</a>
            <a href="/privacy" className="text-white text-sm font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
            <a href="/partner" className="text-white text-sm font-medium hover:text-white/80 transition-colors">Become a Partner</a>
          </div>
        </header>

        {/* Desktop Logo */}
        <a href="/" className="hidden min-[400px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden min-[400px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <a href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</a>
          <a href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
          <a href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">Become a Partner</a>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-12">About<br />ifound</h1>
            <div className="text-lg leading-relaxed space-y-4 text-justify">
              <p>
                ifound was created by two friends with one shared belief: <strong>nothing truly lost should stay lost.</strong>
              </p>
              <p>
                What began as a simple idea grew into a global mission — to help people everywhere reconnect with what they've lost. From pets and wallets to personal belongings, stolen cars, and even missing people, <strong>iFound brings all lost and found cases together in one powerful, worldwide platform.</strong>
              </p>
              <p>
                We're proud to be the <strong>first lost and found app to include people</strong>, because we believe every life matters, and every search deserves a chance to be seen.
              </p>
              <p>
                ifound works because of community. The more people who join, the stronger it becomes. Every post, every share, and every alert increases the chances of a reunion — turning everyday users into real-life heroes.
              </p>
              <p>
                No matter your age, your country, or what you're searching for, ifound is here to help. Together, we're building a world where loss is met with hope, and finding becomes possible.
              </p>
              <p className="font-semibold">
                <strong>ifound — because someone, somewhere, is looking too.</strong>
              </p>
              <p className="mt-8">
                Available worldwide on the <strong>App Store</strong> and <strong>Google Play</strong>, iFound is accessible to anyone, anywhere. No matter your age, your country, or what you're searching for.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
