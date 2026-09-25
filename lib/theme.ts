export const THEME_STORAGE_KEY = "zij-theme";
export const THEME_EVENT = "zij-theme-change";

/**
 * Runs in <head> before first paint. Applies a theme the visitor chose;
 * without a stored choice the CSS follows the device (prefers-color-scheme).
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
