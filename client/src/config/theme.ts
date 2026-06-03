export const getTenantBrandingConfig = (): boolean => {
  const isTenantUser = localStorage.getItem('userType') === 'tenant';
  const pathname = window.location.pathname;
  const isTenantRoute = pathname !== '/' && pathname !== '/mobile' && !pathname.startsWith('/nexus');
  return isTenantUser && isTenantRoute;
};

// Helpers to namespace localStorage keys per-tenant to avoid cross-tenant leakage
export const getTenantId = (): string => {
  return localStorage.getItem('tenant') || '';
};

export const tenantKey = (key: string): string => {
  const t = getTenantId();
  return t ? `${t}__${key}` : key;
};

export const getNamespacedItem = (key: string): string | null => {
  const namespaced = localStorage.getItem(tenantKey(key));
  if (namespaced !== null && namespaced !== undefined) return namespaced;
  return localStorage.getItem(key);
};

export const setNamespacedItem = (key: string, value: string) => {
  localStorage.setItem(tenantKey(key), value);
};

export const applyTheme = () => {
  const useTenantBranding = getTenantBrandingConfig();

  let primaryDark = useTenantBranding ? (getNamespacedItem('theme_primary_dark') || '#0f172a') : '#0f172a';
  let primaryAccent = useTenantBranding ? (getNamespacedItem('theme_primary_accent') || '#6366f1') : '#6366f1';
  let appBg = useTenantBranding ? (getNamespacedItem('theme_app_bg') || '#f4f6fa') : '#f4f6fa';
  let textMain = useTenantBranding ? (getNamespacedItem('theme_text_main') || '#0f172a') : '#0f172a';
  let heroBg = useTenantBranding ? (getNamespacedItem('theme_hero_bg') || 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)') : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
  let heroText = useTenantBranding ? (getNamespacedItem('theme_hero_text') || '#ffffff') : '#ffffff';
  let sidebarText = useTenantBranding ? (getNamespacedItem('theme_sidebar_text') || '#94a3b8') : '#94a3b8';
  let fontSize = useTenantBranding ? (getNamespacedItem('theme_font_size') || '14') : '14';

  // Automatically migrate legacy generic defaults to new premium light/hybrid values
  if (primaryAccent === '#3b82f6') {
    primaryAccent = '#6366f1';
    if (useTenantBranding) setNamespacedItem('theme_primary_accent', '#6366f1');
  }
  if (appBg === '#f8fafc' || appBg === '#ffffff') {
    appBg = '#f4f6fa';
    if (useTenantBranding) setNamespacedItem('theme_app_bg', '#f4f6fa');
  }
  if (textMain === '#1e293b') {
    textMain = '#0f172a';
    if (useTenantBranding) setNamespacedItem('theme_text_main', '#0f172a');
  }
  if (heroBg === '#ffffff' || heroBg === 'linear-gradient(135deg, #e0e7ff 0%, #e0f2fe 100%)') {
    heroBg = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
    if (useTenantBranding) setNamespacedItem('theme_hero_bg', 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)');
  }
  if (heroText === '#0f172a' || heroText === '#1e293b') {
    heroText = '#ffffff';
    if (useTenantBranding) setNamespacedItem('theme_hero_text', '#ffffff');
  }

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

