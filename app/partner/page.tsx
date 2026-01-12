import MobileNav from '../components/MobileNav';

export default function Partner() {
  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About us' },
          { href: '/privacy', label: 'Privacy Policy' }
        ]} />

        {/* Desktop Logo */}
        <a href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
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
                Make your establishment part of the ifound community.
              </p>
              <p>
                Disco clubs, cafés, shopping malls, gyms, hotels, restaurants, and other public spaces can register their location on ifound and manage lost items digitally.
              </p>
              <p>Give visibility to your bussiness and help those who need it most to recover what they've lost.</p>
            </div>

            {/* Partner Form */}
            <div className="mt-12 bg-white rounded-lg p-8 text-black">
              <h2 className="text-2xl font-black mb-6">Partner Application Form</h2>
              <form className="space-y-6">
                {/* Company name */}
                <div>
                  <label htmlFor="company" className="block text-sm font-semibold mb-2">
                    Company name:
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  />
                </div>

                {/* Contact name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Contact name:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First"
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                    />
                    <input
                      type="text"
                      placeholder="Last"
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                    />
                  </div>
                </div>

                {/* Email address */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold mb-2">
                    Email address:
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF]"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold mb-2">
                    Message:
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#38B6FF] resize-none"
                  />
                </div>

                {/* Submit button */}
                <div>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-[#38B6FF] text-white font-semibold rounded hover:bg-[#2FA5EE] transition-colors"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* White Section */}
      <section className="w-full bg-white py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap gap-4 justify-center">
            <a 
              href="/about" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              About us
            </a>
            <a 
              href="/privacy" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="/partner" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              Become a Partner
            </a>
            <a 
              href="/contact" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              Contacts
            </a>
            <a 
              href="/faqs" 
              className="px-4 py-2 text-xl text-[#38B6FF] font-semibold hover:text-[#2FA5EE] transition-colors"
            >
              FAQs
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
