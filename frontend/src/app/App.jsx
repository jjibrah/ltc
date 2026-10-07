import { usePageAnalytics } from '../shared/analytics/usePageAnalytics';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import Navbar from '../shared/layouts/Navbar';
import Footer from '../shared/layouts/Footer';
import DonateModal from '../site/donate/DonateModal';
import PledgeModal from '../site/donate/PledgeModal';

export default function App() {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isPledgeOpen, setIsPledgeOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  usePageAnalytics(pathname);
  const usesPublicChrome = !pathname.startsWith('/admin') && !pathname.startsWith('/portal') && pathname !== '/login' && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/set-password') && !pathname.startsWith('/profile/submit');
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (pathname !== '/set-password' && hashParams.get('type') === 'invite' && hashParams.get('access_token')) {
      navigate({ pathname: '/set-password', hash: window.location.hash }, { replace: true });
    }
  }, [navigate, pathname]);

  useEffect(() => {
    const openDonation = () => setIsDonateOpen(true);
    const openPledge = () => setIsPledgeOpen(true);
    window.addEventListener('ltc:open-donation', openDonation);
    window.addEventListener('ltc:open-pledge', openPledge);
    return () => { window.removeEventListener('ltc:open-donation', openDonation); window.removeEventListener('ltc:open-pledge', openPledge); };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <>
      {usesPublicChrome && <Navbar />}
      <main><AppRouter /></main>
      {usesPublicChrome && <Footer />}
      {usesPublicChrome && <DonateModal isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} />}
      {usesPublicChrome && <PledgeModal isOpen={isPledgeOpen} onClose={() => setIsPledgeOpen(false)} />}
    </>
  );
}
