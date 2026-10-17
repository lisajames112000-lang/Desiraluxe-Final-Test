import { useEffect } from 'react';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(selector);
  if (!element) {element = document.createElement('meta');element.setAttribute(attribute, key);document.head.appendChild(element);}
  element.content = content;
}

export function useDocumentMeta(title: string, description: string, noIndex = false) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', `${window.location.origin}${window.location.pathname}`);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {canonical = document.createElement('link');canonical.rel = 'canonical';document.head.appendChild(canonical);}
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [description, noIndex, title]);
}