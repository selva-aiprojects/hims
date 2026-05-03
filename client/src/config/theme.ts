export const applyTheme = () => {
  const primaryDark = localStorage.getItem('theme_primary_dark');
  const primaryAccent = localStorage.getItem('theme_primary_accent');
  const appBg = localStorage.getItem('theme_app_bg');
  const textMain = localStorage.getItem('theme_text_main');
  const heroBg = localStorage.getItem('theme_hero_bg');
  const heroText = localStorage.getItem('theme_hero_text');
  const fontSize = localStorage.getItem('theme_font_size');

  const root = document.documentElement;
  if (primaryDark) root.style.setProperty('--primary-dark', primaryDark);
  if (primaryAccent) root.style.setProperty('--primary-accent', primaryAccent);
  if (appBg) root.style.setProperty('--app-bg', appBg);
  if (textMain) root.style.setProperty('--text-main', textMain);
  if (heroBg) root.style.setProperty('--hero-bg', heroBg);
  if (heroText) root.style.setProperty('--hero-text', heroText);
  if (fontSize) root.style.setProperty('--base-font-size', `${fontSize}px`);
};
