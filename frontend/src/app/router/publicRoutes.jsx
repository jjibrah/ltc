import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Home = lazy(() => import('../../site/home/Home'));
const AboutPage = lazy(() => import('../../site/about/AboutPage'));
const Impact = lazy(() => import('../../site/impact/Impact'));
const Stories = lazy(() => import('../../site/stories/Stories'));
const Team = lazy(() => import('../../site/team/Team'));
const Donate = lazy(() => import('../../site/donate/Donate'));
const DonationSuccess = lazy(() => import('../../site/donate/DonationSuccess'));
const Unsubscribe = lazy(() => import('../../site/newsletter/Unsubscribe'));
const MentorAStudent = lazy(() => import('../../site/mentorship/MentorAStudent'));
const PublicProfileSubmissionPage = lazy(() => import('../../site/team/PublicProfileSubmissionPage'));

export function getPublicRoutes() {
  return [
    { path: '/', element: <Home /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/mission', element: <AboutPage /> },
    { path: '/impact', element: <Impact /> },
    { path: '/stories', element: <Stories /> },
    { path: '/team', element: <Team /> },
    { path: '/donate', element: <Donate /> },
    { path: '/donation-success', element: <DonationSuccess /> },
    { path: '/mentor', element: <MentorAStudent /> },
    { path: '/profile/submit/:token', element: <PublicProfileSubmissionPage /> },
    { path: '/unsubscribe/:token', element: <Unsubscribe /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ];
}
