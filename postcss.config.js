// PostCSS is only used for autoprefixing; Tailwind CSS v4 is compiled by the
// `@tailwindcss/vite` plugin (see vite.config.ts) and needs no PostCSS plugin.
export default {
  plugins: {
    autoprefixer: {},
  },
};
