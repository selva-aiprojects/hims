export const getTenantBrandingConfig = (): boolean => {
  const isTenantUser = localStorage.getItem('userType') === 'tenant';
  const pathname = window.location.pathname;
  const isTenantRoute = pathname !== '/' && pathname !== '/mobile' && !pathname.startsWith('/nexus');
  return isTenantUser && isTenantRoute;
};

export const applyTheme = () => {
  const useTenantBranding = getTenantBrandingConfig();

  const primaryDark = useTenantBranding ? (localStorage.getItem('theme_primary_dark') || '#0f172a') : '#0f172a';
  const primaryAccent = useTenantBranding ? (localStorage.getItem('theme_primary_accent') || '#3b82f6') : '#3b82f6';
  const appBg = useTenantBranding ? (localStorage.getItem('theme_app_bg') || '#f8fafc') : '#f8fafc';
  const textMain = useTenantBranding ? (localStorage.getItem('theme_text_main') || '#1e293b') : '#1e293b';
  const heroBg = useTenantBranding ? (localStorage.getItem('theme_hero_bg') || '#ffffff') : '#ffffff';
  const heroText = useTenantBranding ? (localStorage.getItem('theme_hero_text') || '#0f172a') : '#0f172a';
  const sidebarText = useTenantBranding ? (localStorage.getItem('theme_sidebar_text') || '#94a3b8') : '#94a3b8';
  const fontSize = useTenantBranding ? (localStorage.getItem('theme_font_size') || '14') : '14';

  const root = document.documentElement;
  root.style.setProperty('--primary-dark', primaryDark);
  root.style.setProperty('--primary-accent', primaryAccent);
  root.style.setProperty('--app-bg', appBg);
  root.style.setProperty('--text-main', textMain);
  root.style.setProperty('--hero-bg', heroBg);
  root.style.setProperty('--hero-text', heroText);
  root.style.setProperty('--sidebar-text', sidebarText);
  root.style.setProperty('--base-font-size', `${fontSize}px`);
  document.body.style.fontSize = `${fontSize}px`;
};

