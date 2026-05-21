export const applyTheme = () => {
  const primaryDark = localStorage.getItem('theme_primary_dark') || '#0f172a';
  const primaryAccent = localStorage.getItem('theme_primary_accent') || '#3b82f6';
  const appBg = localStorage.getItem('theme_app_bg') || '#f8fafc';
  const textMain = localStorage.getItem('theme_text_main') || '#1e293b';
  const heroBg = localStorage.getItem('theme_hero_bg') || '#ffffff';
  const heroText = localStorage.getItem('theme_hero_text') || '#0f172a';
  const fontSize = localStorage.getItem('theme_font_size') || '14';

  const root = document.documentElement;
  root.style.setProperty('--primary-dark', primaryDark);
  root.style.setProperty('--primary-accent', primaryAccent);
  root.style.setProperty('--app-bg', appBg);
  root.style.setProperty('--text-main', textMain);
  root.style.setProperty('--hero-bg', heroBg);
  root.style.setProperty('--hero-text', heroText);
  root.style.setProperty('--base-font-size', `${fontSize}px`);
  document.body.style.fontSize = `${fontSize}px`;
};
