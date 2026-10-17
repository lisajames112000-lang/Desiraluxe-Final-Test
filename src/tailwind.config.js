import rootConfig from '../tailwind.config.js';

// Retain the original theme and scan the actual application after moving the
// Vercel build root to src. Avoid scanning installed dependencies.
export default {
  ...rootConfig,
  content: {
    relative: true,
    files: [
      './index.html',
      './*.{js,ts,jsx,tsx}',
      './{components,contexts,data,hooks,pages,utils}/**/*.{js,ts,jsx,tsx}'
    ]
  }
};
