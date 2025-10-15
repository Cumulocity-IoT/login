import type { ConfigurationOptions } from '@c8y/devkit';
import { author, version, description, license } from './package.json';
import { gettext } from '@c8y/ngx-components/gettext';

const defaultDescription = gettext(
  'The Login application provides functionalities for login and password reset.'
);

export default {
  runTime: {
    author,
    version,
    name: 'Login',
    description: description || defaultDescription,
    dynamicOptionsUrl: true,
    icon: {
      class: 'cloud-user'
    },
    noAppSwitcher: true,
    noLogin: true,
    availability: 'MARKET',
    license
  },
  buildTime: {
    federation: 'none',
    skipMonacoLanguageSupport: true
  }
} as const satisfies ConfigurationOptions;
