import RouteErrorBoundary from './RouteErrorBoundary';
import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { adminRoutes } from './adminRoutes';
import { authRoutes } from './authRoutes';
import { portalRoutes } from './portalRoutes';
import { getPublicRoutes } from './publicRoutes';

export default function AppRouter() {
  const routes = [...getPublicRoutes(), ...authRoutes, ...adminRoutes, ...portalRoutes];
  return (
    <RouteErrorBoundary><Suspense fallback={<AppLoadingScreen />}>
      <Routes>{routes.map(renderRoute)}</Routes>
    </Suspense></RouteErrorBoundary>
  );
}

function AppLoadingScreen() {
  return <div className="app-loading-screen" role="status" aria-live="polite">
    <div className="app-loading-screen__mark" aria-hidden="true">LTC</div>
    <strong>Living the Charge</strong>
    <span>Preparing your experience...</span>
  </div>;
}

function renderRoute(route) {
  return <Route key={`${route.path || 'index'}-${route.index ? 'index' : ''}`} {...route}>
    {route.children?.map(renderRoute)}
  </Route>;
}
