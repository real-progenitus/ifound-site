import { getUserProfile } from '@/lib/get-user-profile';
import { getUserPosts } from '@/lib/get-user-posts';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/routing';
import MobileNav from '../../../components/MobileNav';
import PageFooter from '../../../components/PageFooter';
import Logo from '../../../components/Logo';
import CopyButton from '../../../components/CopyButton';

export default async function ProfilePage({ params }: { params: Promise<{ uid: string; locale: string }> }) {
  const { uid } = await params;
  const profile = await getUserProfile(uid);
  const t = await getTranslations('profile');
  const nav = await getTranslations('nav');

  if (!profile) {
    return (
      <div className="min-h-screen font-sans">
        <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
          <MobileNav links={[
            { href: '/', label: 'Home' },
            { href: '/about', label: nav('aboutUs') },
            { href: '/contact', label: nav('contacts') }
          ]} />
          <Logo className="hidden min-[600px]:flex absolute top-4 left-8 z-10" />
          <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-center">
            <Link href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</Link>
            <Link href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('aboutUs')}</Link>
            <Link href="/contact" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('contacts')}</Link>
          </div>
          <main className="flex items-center justify-center min-h-screen p-8">
            <div className="text-center text-white">
              <h1 className="text-4xl font-black mb-4">{t('userNotFound')}</h1>
              <p className="text-lg mb-8 opacity-80">{t('userNotFoundDescription')}</p>
              <Link href="/" className="inline-block bg-white text-[#38B6FF] font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-colors">
                {t('goHome')}
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const posts = await getUserPosts(profile.email);

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen font-sans">
      <div className="w-full h-full min-h-screen bg-[#38B6FF] overflow-hidden flex flex-col min-[400px]:block min-[400px]:relative transition-all duration-500 ease-in-out">
        {/* Mobile Navigation */}
        <MobileNav links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: nav('aboutUs') },
          { href: '/contact', label: nav('contacts') }
        ]} />

        {/* Desktop Logo */}
        <Logo className="hidden min-[600px]:flex absolute top-4 left-8 z-10" />

        {/* Desktop Navigation */}
        <div className="hidden min-[600px]:flex absolute top-8 right-8 z-10 gap-6 items-center">
          <Link href="/" className="text-white text-base font-medium hover:text-white/80 transition-colors">Home</Link>
          <Link href="/about" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('aboutUs')}</Link>
          <Link href="/contact" className="text-white text-base font-medium hover:text-white/80 transition-colors">{nav('contacts')}</Link>
        </div>

        {/* Profile Content */}
        <main className="flex items-start justify-center min-h-screen p-8 pt-20 min-[600px]:pt-32">
          <div className="max-w-4xl w-full">
            {/* Found Something Text */}
            <p className="text-center text-white text-3xl md:text-4xl font-black mb-6">{t('foundSomething')}</p>

            {/* Profile Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-12 text-white">
              {/* Avatar & Name */}
              <div className="flex flex-col items-center mb-8">
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.name}
                    className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white/30 shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/20 border-4 border-white/30 shadow-lg flex items-center justify-center">
                    <span className="text-3xl md:text-4xl font-bold text-white">{initials}</span>
                  </div>
                )}
                <h1 className="text-2xl md:text-3xl font-black mt-5 text-center">{profile.name}</h1>
                <p className="text-white/70 text-sm mt-1">{t('memberSince')} {memberSince}</p>
              </div>

              {/* Info */}
              <div className="space-y-4">
                {profile.email && (
                  <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4">
                    <svg className="w-5 h-5 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs text-white/50 uppercase tracking-wide">{t('email')}</p>
                      <p className="text-white font-medium truncate">{profile.email}</p>
                    </div>
                    <CopyButton text={profile.email} />
                  </div>
                )}

                {profile.phoneNumber && (
                  <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4">
                    <svg className="w-5 h-5 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wide">{t('phone')}</p>
                      <p className="text-white font-medium">{profile.phoneNumber}</p>
                    </div>
                    <CopyButton text={profile.phoneNumber} />
                  </div>
                )}
              </div>
            </div>
            {/* Posts Section */}
            {posts.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl md:text-3xl font-black text-white mb-6">{t('posts')}</h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {posts.map((post) => {
                    const postDate = new Date(post.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <div key={post.id} className="bg-white backdrop-blur-sm rounded-xl overflow-hidden text-gray-800 flex-shrink-0 w-56">
                        {post.images.length > 0 && (
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${
                              post.type === 'Lost' ? 'bg-red-500' : 'bg-green-500'
                            }`}>
                              {post.type}
                            </span>
                            <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                              {post.category}
                            </span>
                            {post.isResolved && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500 text-white">
                                {t('resolved')}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold mt-1 line-clamp-1">{post.title}</h3>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{post.description}</p>
                          {post.address && (
                            <div className="flex items-center gap-1.5 mt-2 text-gray-400 text-xs">
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="line-clamp-1">{post.address}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-gray-400 text-[10px]">{postDate}</span>
                            {post.reward && post.reward !== '0' && (
                              <span className="text-[10px] font-bold bg-[#38B6FF]/10 text-[#38B6FF] px-2 py-0.5 rounded-full">
                                {post.reward} {post.currency}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

        <PageFooter />
      </div>
    </div>
  );
}
