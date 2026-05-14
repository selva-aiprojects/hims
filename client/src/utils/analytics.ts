import posthog from 'posthog-js';

export const initAnalytics = () => {
  // Initializing with your project-specific PostHog key
  posthog.init('phc_CYmYHasSPxtW4jYVnUjYk6TEDza34s5y9kRGgfdKxGok', {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage'
  });
};

export const identifyUser = (user: { id: string; email: string; role: string; tenant: string }) => {
  posthog.identify(user.id, {
    email: user.email,
    role: user.role,
    tenant_id: user.tenant,
  });
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  posthog.capture(eventName, properties);
};

export default posthog;
