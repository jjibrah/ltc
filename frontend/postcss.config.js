import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

// Keep the canonical frontend isolated from the legacy root PostCSS config.
export default {
  plugins: {
    tailwindcss,
    autoprefixer,
  },
};
