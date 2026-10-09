import RouteErrorBoundary from './RouteErrorBoundary';
import { Suspense, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { adminRoutes } from './adminRoutes';
import { authRoutes } from './authRoutes';
import { portalRoutes } from './portalRoutes';
import { getPublicRoutes } from './publicRoutes';
import AppLoadingScreen from '../../shared/components/feedback/AppLoadingScreen';

export default function AppRouter() {
  const [isPreparing, setIsPreparing] = useState(true);
  useEffect(() => {
    const openingTimer = window.setTimeout(() => setIsPreparing(false), 1000);
    return () => window.clearTimeout(openingTimer);
  }, []);

  const routes = [...getPublicRoutes(), ...authRoutes, ...adminRoutes, ...portalRoutes];
  return (
    <RouteErrorBoundary>
      {isPreparing && <AppLoadingScreen />}
      <div className="app-route-content" hidden={isPreparing}>
        <Suspense fallback={isPreparing ? null : <AppLoadingScreen />}>
          <Routes>{routes.map(renderRoute)}</Routes>
        </Suspense>
      </div>
    </RouteErrorBoundary>
  );
}

function renderRoute(route) {
  return <Route key={`${route.path || 'index'}-${route.index ? 'index' : ''}`} {...route}>
    {route.children?.map(renderRoute)}
  </Route>;
}
