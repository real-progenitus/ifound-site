export default function Partner() {
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
            <a href="/about" className="text-white text-sm font-medium hover:text-white/80 transition-colors">About us</a>
            <a href="/privacy" className="text-white text-sm font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
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
          <a href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">About us</a>
          <a href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">Become a<br />partner<br />with<br />ifound</h1>
            <div className="text-lg leading-relaxed space-y-4">
              <p>
                Every day, people lose important things in public places — and many of them are found by staff before their owners ever realize where to look.
              </p>
              <p>
                By becoming an ifound Partner, your place becomes part of a global lost and found network that helps reunite people with what they've lost — faster and easier.
              </p>
              <p>
                Disco clubs, cafés, shopping malls, gyms, hotels, restaurants, and other public spaces can register their location on ifound and manage lost items digitally. Instead of a forgotten box behind the counter, lost items are visible to thousands of people searching in real time.
              </p>
              <p>Partnering with ifound means:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Helping customers and visitors feel safer and more supported</li>
                <li>Reducing time spent handling lost items</li>
                <li>Increasing trust, professionalism, and community impact</li>
                <li>Being part of a worldwide platform that helps people every day</li>
              </ul>
              <p className="font-semibold">
                With ifound, your place doesn't just host people — it helps them find their way back.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
