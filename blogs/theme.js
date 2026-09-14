(() => {
  const root = document.documentElement;
  try { const saved = localStorage.getItem('theme'); if (saved) root.dataset.theme = saved; } catch (_) {}
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (_) {}
  });
})();
