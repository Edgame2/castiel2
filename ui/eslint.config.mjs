import nextConfig from 'eslint-config-next';
import eslintConfigPrettier from 'eslint-config-prettier';

const config = [
  ...nextConfig,
  eslintConfigPrettier,
  {
    files: (path) =>
      (path.includes('src/app') || path.includes('src/components')) &&
      !path.includes('src/components/ui/'),
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message: 'Use Button from @/components/ui/button instead of raw <button>.',
        },
        {
          selector: 'JSXOpeningElement[name.name="input"]',
          message: 'Use Input from @/components/ui/input instead of raw <input>.',
        },
        {
          selector: 'JSXOpeningElement[name.name="textarea"]',
          message: 'Use Textarea from @/components/ui/textarea instead of raw <textarea>.',
        },
        {
          selector: 'JSXOpeningElement[name.name="select"]',
          message: 'Use Select, SelectTrigger, SelectContent, SelectItem from @/components/ui/select instead of raw <select>.',
        },
        {
          selector: 'JSXOpeningElement[name.name="label"]',
          message: 'Use Label from @/components/ui/label instead of raw <label> for form labels.',
        },
      ],
    },
  },
];
export default config;