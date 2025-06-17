import { IApplication } from '@c8y/client';
import './i18n';

const barHolder: HTMLElement | null = document.querySelector('body > .init-load');
export const removeProgress = () => barHolder?.parentNode?.removeChild(barHolder);

applicationSetup();

async function applicationSetup() {
  const { loadOptions, applyOptions } = await import('@c8y/bootstrap');
  const options = await loadOptions();
  await applyOptions({
    ...options
  });
  const { bootstrap } = await import(
    /* webpackPreload: true */
    './bootstrap'
  );

  const { name, contextPath, key } = options as Partial<IApplication>;
  bootstrap({
    options,
    currentApp: { name, contextPath, key }
  }).then(removeProgress);
}
