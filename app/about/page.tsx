import MobileNav from '../components/MobileNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import PageFooter from '../components/PageFooter';

export default function About() {
  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out pb-16">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/privacy', label: 'Privacy Policy' },
          { href: '/partner', label: 'Become a Partner' }
        ]} />

        {/* Desktop Logo */}
        <a href="/" className="hidden min-[600px]:flex absolute top-4 left-8 z-10 items-start gap-0">
          <img src="/logopin.png" alt="Logo" width={95} height={95} className="object-contain" />
          <span className="text-white text-3xl font-semibold -ml-5 translate-y-4">ifound</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-start">
          <a href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</a>
          <a href="/privacy" className="text-white text-base font-medium hover:text-white/80 transition-colors">Privacy Policy</a>
          <a href="/partner" className="text-white text-base font-medium hover:text-white/80 transition-colors">Become a Partner</a>
        </div>

        {/* Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl text-white w-full">
            <h1 className="font-black leading-tight text-white uppercase text-2xl min-[500px]:text-3xl min-[600px]:text-4xl md:text-5xl lg:text-6xl mb-12">About<br />ifound</h1>
            <div className="text-lg leading-relaxed space-y-6 text-justify">
              <p>
                Welcome to ifound, the app designed to reunite you with your lost items quickly and efficiently. Losing something valuable can be stressful, but with our app, we&apos;re here to make the process of finding and reclaiming your lost belongings as smooth as possible. Whether it&apos;s a misplaced phone, a lost wallet, or even a beloved pet, Lost & Found is your trusted companion in these moments of need.
              </p>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">Getting Started:</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>Download the App: First things first, download ifound from the App Store (for iOS) or Google Play Store (for Android).</li>
                  <li>Sign Up: Once downloaded, sign up for an account using your email address or social media accounts.</li>
                  <li>Set Up Your Profile: Take a moment to complete your profile with relevant information such as your name, contact details, and a profile picture.</li>
                  <li>Enable Location Services: To make the most of ifound, ensure that location services are enabled on your device. This will help in accurately pinpointing the location where you lost or found an item.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">Reporting a Lost Item:</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>Tap on &quot;Report Lost Item&quot;: Open the app and navigate to the &quot;Report Lost Item&quot; section.</li>
                  <li>Provide Details: Fill in all the necessary details about the lost item, including its description, where and when it was lost, and any distinctive features.</li>
                  <li>Upload a Photo: If possible, upload a clear photo of the lost item to help others identify it.</li>
                  <li>Submit the Report: Once you&apos;ve provided all the required information, submit the report.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">Finding a Lost Item:</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>Explore the Map: Check the map within the app to see if anyone has reported finding your lost item in your vicinity.</li>
                  <li>Contact the Finder: If you spot your lost item on the map, reach out to the person who found it via the in-app messaging feature.</li>
                  <li>Arrange for Pickup: Coordinate with the finder to arrange for the safe return of your lost item.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold mt-8">Tips for Success:</h2>
                <ol className="list-decimal list-inside space-y-3 ml-2">
                  <li>Act Quickly: The sooner you report a lost item, the higher the chances of it being found and returned to you.</li>
                  <li>Be Detailed: Provide as much detail as possible when reporting a lost item to help others identify it accurately.</li>
                  <li>Check Regularly: Make it a habit to check the app regularly for any updates or new listings related to your lost item.</li>
                  <li>Stay in Touch: Keep communication lines open with both the app administrators and anyone who may have found your lost item.</li>
                </ol>
              </div>

              <p className="mt-8">
                ifound is here to help you navigate the stressful experience of losing valuable belongings. By following these simple steps and utilizing the features of our app, you can increase the likelihood of being reunited with your lost items. Remember, you&apos;re not alone in this journey - we&apos;re here to support you every step of the way.
              </p>
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
