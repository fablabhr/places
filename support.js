/**
 * support.js — Claude Design deck runtime shim
 *
 * Handles <x-dc> and <x-import component-from-global-scope="…"> by
 * injecting <helmet> children into <head> and upgrading the x-import
 * element into the named custom element once its module is loaded.
 */
(function () {
  class XDC extends HTMLElement {
    connectedCallback() {
      const helmet = this.querySelector(':scope > helmet');
      if (helmet) {
        Array.from(helmet.childNodes).forEach(node => {
          document.head.appendChild(node.cloneNode(true));
        });
        helmet.remove();
      }
    }
  }
  customElements.define('x-dc', XDC);

  class XImport extends HTMLElement {
    connectedCallback() {
      const src = this.getAttribute('from');
      const tag = this.getAttribute('component-from-global-scope');
      if (src && !document.querySelector(`script[data-xi="${src}"]`)) {
        const s = document.createElement('script');
        s.src = src;
        s.dataset.xi = src;
        document.head.appendChild(s);
      }
      if (tag) {
        customElements.whenDefined(tag).then(() => {
          // Collect light children
          const children = Array.from(this.childNodes);
          const upgraded = document.createElement(tag);
          // Copy attributes
          Array.from(this.attributes).forEach(a => {
            if (!['from', 'component-from-global-scope'].includes(a.name)) {
              upgraded.setAttribute(a.name, a.value);
            }
          });
          children.forEach(c => upgraded.appendChild(c));
          this.replaceWith(upgraded);
        });
      }
    }
  }
  customElements.define('x-import', XImport);
})();
