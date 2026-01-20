import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import PageFooter from '../components/PageFooter';

export default function Contact() {
  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out pb-16">
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
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-6">Contact<br />Us</h1>
            <div className="text-lg leading-relaxed space-y-4">
              <p>
                Have questions or need assistance? We&apos;re here to help!
              </p>
              
              <div className="space-y-6 mt-8">
                <div>
                  <h3 className="text-xl font-bold mb-2">Email</h3>
                  <a href="mailto:support@ifound.tech" className="text-[#1f3577] underline hover:text-[#1f3577]/80 transition-colors text-lg">
                    support@ifound.tech
                  </a>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Phone</h3>
                  <a href="tel:+1234567890" className="text-[#1f3577] underline hover:text-[#1f3577]/80 transition-colors text-lg">
                    +1 (234) 567-890
                  </a>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Office Hours</h3>
                  <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                  <p>Saturday: 10:00 AM - 4:00 PM</p>
                  <p>Sunday: Closed</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Address</h3>
                  <p>123 Tech Street</p>
                  <p>Innovation District</p>
                  <p>San Francisco, CA 94105</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* App Store and Google Play Buttons */}
        <div className="flex justify-center items-center pt-16 pb-12 px-4">
          <div className="flex flex-row gap-3 text-sm font-semibold">
            <button className="flex h-12 w-[130px] items-center justify-center gap-1.5 rounded-full bg-black text-white transition-colors hover:bg-black/80">
              <FontAwesomeIcon icon={faApple} className="h-5 w-5 flex-shrink-0 -mt-0.5" />
              <span className="text-sm leading-none">App Store</span>
            </button>
            <button className="flex h-12 w-[130px] items-center justify-center gap-1.5 rounded-full bg-white text-black transition-colors hover:bg-white/90">
              <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm leading-none">Google Play</span>
            </button>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
