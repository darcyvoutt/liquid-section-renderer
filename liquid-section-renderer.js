class LiquidSectionRenderer extends HTMLElement {
  constructor() {
    super();

    // Internal variables
    this._acceptedEvents = {
      '*': 'click',
      button: 'click',
      form: 'submit',
      input: 'input',
      select: 'change',
      textarea: 'input',
    };
    this._attrs = {
      mode: 'update-mode',
      section: 'section',
      trigger: 'trigger',
      target: 'target',
      updates: 'updates',
    };
    this._boundEventListeners = new Map();
    this._events = {
      init: 'liquid-render-init',
      started: 'liquid-render-started',
      ended: 'liquid-render-ended',
      error: 'liquid-render-error',
      destroy: 'liquid-render-destroying',
    };
    this._loading = false;
    this._loadingElement = null;
    this._timeoutId = null;
    this._triggers = this.querySelectorAll(`[${this._attrs.trigger}]`) || null;
    this._urlBase = window?.Shopify?.routes?.root || window.location.pathname;

    // Parent Attributes
    this.debounceTime = parseInt(this.getAttribute('debounce'), 10) || 300;
    this.loadingSelector = this.getAttribute('loading-selector') || null;
    this.loadingClass = this.getAttribute('loading-class') || null;
    this.historyMode = this.getAttribute('history-mode') || null;
    this.scoped = (this.getAttribute('scoped') || 'true').toLowerCase() === 'true';
    this.timeout = parseInt(this.getAttribute('timeout'), 10) || 5000;
    this.renderUrl = this.getAttribute('render-url') || this._urlBase;
    this.updateUrl = this.getAttribute('update-url') || null;
    this.updateTitle = this.getAttribute('update-title') || null;
  }

  // System functions
  connectedCallback() {
    if (this._isInvalid()) return;

    // Set up event listeners on child elements with section-trigger attributes
    this._addEventListeners();

    // Find loading element if specified
    this._findLoadingElement();

    // Emit initialization event
    this._event(this._events.init);
  }

  disconnectedCallback() {
    this._event(this._events.destroy);

    // Clear any pending debounced events
    if (this._timeoutId) clearTimeout(this._timeoutId);

    // Remove all event listeners
    this._boundEventListeners.forEach((config, trigger) => {
      trigger.removeEventListener(config.type, config.listener);
    });

    this._boundEventListeners.clear();

    // Clear references
    this._loadingElement = null;
    this._triggers = null;
  }

  // Async functions
  async _handleEvent(event, trigger) {
    try {
      // Get data from updates attribute
      let { updates, sections } = this._getUpdatesArray(trigger);
      const updateMode = trigger.getAttribute(this._attrs.mode) || 'replace';

      // If attribute is not found, build with section-id, section-target
      if (!updates.length) {
        const section = trigger.getAttribute(this._attrs.section) || null;
        const target = trigger.getAttribute(this._attrs.target) || null;

        if (!section || !target) {
          throw new Error('Either `section-id`, `section-target`, or `section-updates` attributes are required');
        }

        updates = [{ section, target }];
        sections = [section];
      }

      // Validate updates structure
      if (!this._validateUpdates(updates)) {
        throw new Error('Invalid updates structure');
      }

      this._toggleLoading();

      const sectionsData = await Promise.race([
        this._fetchSections(sections),
        this._requestTimeout(),
      ]);

      this._updateSection({ sectionsData, updates, updateMode });
      this._updateHistory();
    } catch (error) {
      console.error('Section render failed:', error);
      this._event(this._events.error);
    } finally {
      this._toggleLoading();
    }
  }

  async _fetchSections(sections) {
    const url = this._buildUrl(sections);

    if (!url) throw new Error('Failed to build a URL');

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch section: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch section', error);
      throw error;
    }
  }

  // Methods
  _addEventListeners() {
    this._triggers.forEach((trigger) => {

      const event = this._getEventType(trigger);

      if (!event) {
        console.warn(`The supported event types are: ${Object.values(this._acceptedEvents).join(', ')}`);
        throw new Error(`Invalid event type: ${trigger.tagName.toLowerCase()}`);
      }

      const boundListener = (event) => {
        this._debounce(() => this._handleEvent(event, trigger), this.debounceTime);
      }

      this._boundEventListeners.set(trigger, { type: event, listener: boundListener });
      trigger.addEventListener(event, boundListener);
    });
  }

  _buildUrl(sections) {
    if (!sections) return;

    const url = new URL(this.renderUrl, window.location.origin);
    const params = new URLSearchParams(url.search);
    let sectionsParam = '';

    if (Array.isArray(sections)) {
      sectionsParam = sections.join(',').trim();
    } else {
      sectionsParam = sections.trim();
    }

    params.set('sections', sectionsParam);
    url.search = params.toString();

    return url.toString();
  }

  _debounce(func, wait) {
    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(func, wait);
  }

  _event(name) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true }));
  }

  _findElement(selector) {
    const element = this.scoped ? this.querySelector(selector) : document.querySelector(selector);
    return element || null;
  }

  _findLoadingElement() {
    if (!this.loadingSelector) return;

    // Find loading element
    this._loadingElement = this._findElement(this.loadingSelector);

    // Hide loading element if no loading class is specified
    if (!this.loadingClass && this._loadingElement) {
      this._loadingElement.style.display = 'none';
    }
  }

  _getEventType(trigger) {
    const element = trigger.tagName.toLowerCase();
    return (
      this._acceptedEvents[element] ?
      this._acceptedEvents[element] :
      this._acceptedEvents['*']
    );
  }

  _getUpdatesArray(trigger) {
    const result = {
      updates: [],
      sections: [],
    };

    try {
      const attr = trigger.getAttribute(this._attrs.updates);

      if (!attr) return result;

      const str = attr.replace(/\s+/g, ' ').trim();
      const updates = JSON.parse(str);

      if (!Array.isArray(updates)) throw new Error('The `section-updates` attribute must be an array');

      const sections = [...new Set(updates.map(update => update.section))];

      result.sections = sections;
      result.updates = updates;

      return result;
    } catch (error) {
      console.warn(error);

      return result;
    }
  }

  _isInvalid() {
    if (!this._triggers) {
      console.warn('🚫 At least one trigger is required.');
      return true;
    }

    return false;
  }

  _requestTimeout() {
    return new Promise((_, reject) =>
      setTimeout(() =>
        reject(new Error('🚫 Request timeout to fetch section.')),
        this.timeout
      )
    );
  }

  _toggleLoading() {
    this._loading = !this._loading;

    // Do nothing if loading element is not found
    if (!this._loadingElement) return;

    // Toggle class or display based on loading state
    if (this.loadingClass) {
      this._loadingElement.classList.toggle(this.loadingClass, this._loading);
    } else {
      this._loadingElement.style.display = this._loading ? 'block' : 'none';
    }

    if (this._loading) this._event(this._events.started);
    if (!this._loading) this._event(this._events.ended);
  }

  _updateHistory() {
    // Do nothing if history mode is not set
    if (!this.historyMode) return;

    // Update history
    switch (this.historyMode) {
      case 'add':
      case 'push':
        history.pushState({}, '', this.updateUrl);
        break;
      case 'replace':
        history.replaceState({}, '', this.updateUrl);
        break;
    }

    // Update title
    if (this.updateTitle) document.title = this.updateTitle;
  }

  _updateSection({ sectionsData, updates, updateMode }) {
    try {
      updates.forEach(({ section, target }) => {
        const data = sectionsData[section];
        const doc = new DOMParser().parseFromString(data, 'text/html');
        const sectionElement = doc.querySelector(`#shopify-section-${section}`);
        const targetElement = this._findElement(target);

        // Throw error if target element is not found
        if (!targetElement) throw new Error(`Failed to find target element: ${target}`);

        // Update targetElement
        switch (updateMode) {
          case 'after':
          case 'append':
            targetElement.appendChild(sectionElement);
            break;
          case 'before':
          case 'prepend':
            targetElement.prepend(sectionElement);
            break;
          case 'replace':
          case null:
            targetElement.innerHTML = sectionElement.innerHTML;
            break;
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  _validateUpdates(updates) {
    return updates.every(update =>
      update &&
      typeof update === 'object' &&
      typeof update.section === 'string' &&
      typeof update.target === 'string'
    );
  }
}

customElements.define('liquid-section-renderer', LiquidSectionRenderer);
