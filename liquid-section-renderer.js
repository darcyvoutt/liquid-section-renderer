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
      cloak: 'cloak',
      mode: 'update-mode',
      section: 'section',
      trigger: 'trigger',
      triggerIntersect: 'trigger-intersect',
      triggerInit: 'trigger-init',
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

    // Internal variables
    this._observer = null;
    this._loading = false;
    this._loadingElement = null;
    this._timeoutId = null;
    this._triggers = null;
    this._triggerInits = null;
    this._triggerIntersects = null;

    // Parent Attributes
    this.debounceTime = parseInt(this.getAttribute('debounce'), 10) || 300;
    this.id = this.getAttribute('id') || `${Math.random().toString(36).substring(2, 10)}`;
    this.intersectMargin = `${this.getAttribute('intersect-margin') || 0}px`;
    this.intersectThreshold = (parseFloat(this.getAttribute('intersect-threshold')) / 100) || 0.1;
    this.loadingSelector = this.getAttribute('loading-selector') || null;
    this.loadingClass = this.getAttribute('loading-class') || null;
    this.historyMode = this.getAttribute('history-mode') || null;
    this.scoped = (this.getAttribute('scoped') || 'true').toLowerCase() === 'true';
    this.timeout = parseInt(this.getAttribute('timeout'), 10) || 5000;
    this.updateUrl = this.getAttribute('update-url') || null;
    this.updateTitle = this.getAttribute('update-title') || null;
  }

  // System functions
  connectedCallback() {
    this._findTriggers();

    if (this._isInvalidInit()) return;

    // Set up event listeners on child elements with section-trigger attributes
    this._addEventListeners();

    // Find needed elements
    this._findLoadingElement();

    // Emit initialization event
    this._event(this._events.init);

    // Handle trigger inits and observe intersections
    this._handleTriggerInits();
    this._observeIntersections();
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

    // Clean up observer
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  // Async functions
  async _handleTrigger(trigger) {
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
      if (!this._isValidUpdates(updates)) {
        throw new Error('🚫 Invalid `updates` structure');
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

  async _handleTriggerInits() {
    if (!this._triggerInits) return;
    const triggerPromises = Array.from(this._triggerInits).map((trigger) => this._handleTrigger(trigger));
    await Promise.allSettled(triggerPromises);
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
    if (!this._triggers) return;

    this._triggers.forEach((trigger) => {

      const eventType = this._getEventType(trigger);

      if (!eventType) {
        console.warn(`The supported event types are: ${Object.values(this._acceptedEvents).join(', ')}`);
        throw new Error(`Invalid event type: ${trigger.tagName.toLowerCase()}`);
      }

      const boundListener = (event) => {
        event.preventDefault();
        this._debounce(() => this._handleTrigger(trigger), this.debounceTime);
      }

      this._boundEventListeners.set(trigger, { type: eventType, listener: boundListener });
      trigger.addEventListener(eventType, boundListener);
    });
  }

  _buildUrl(sections) {
    if (!sections) return;

    const renderUrl = this.getAttribute('render-url') || window.location.pathname;
    const url = new URL(renderUrl, window.location.origin);
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
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { id: this.id } }));
  }

  _findElement(selector, forceScoped = false) {
    const element = this.scoped || forceScoped ? this.querySelector(selector) : document.querySelector(selector);
    return element || null;
  }

  _findElements(selector, forceScoped = false) {
    const elements = this.scoped || forceScoped ? this.querySelectorAll(selector) : document.querySelectorAll(selector);
    return elements.length > 0 ? Array.from(elements) : null;
  }

  _findTriggers() {
    this._triggers = this._findElements(`[${this._attrs.trigger}]`, true) || null;
    this._triggerInits = this._findElements(`[${this._attrs.triggerInit}]`, true) || null;
    this._triggerIntersects = this._findElements(`[${this._attrs.triggerIntersect}]`, true);
  }

  _findLoadingElement() {
    if (!this.loadingSelector) return;

    // Find loading element
    this._loadingElement = this._findElement(this.loadingSelector);

    // Remove cloaks
    if (this._loadingElement && this._loadingElement.hasAttribute(this._attrs.cloak)) {
      this._loadingElement.removeAttribute(this._attrs.cloak);
    }

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

  _isInvalidInit() {
    if (!this._triggers && !this._triggerInits && !this._triggerIntersects) {
      console.warn('🚫 At least one trigger is required.');
      return true;
    }

    return false;
  }

  _isValidUpdates(updates) {
    return updates.every(update =>
      update &&
      typeof update === 'object' &&
      typeof update.section === 'string' &&
      typeof update.target === 'string'
    );
  }

  _observeIntersections() {
    if (!this._triggerIntersects) return;

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        this._handleTrigger(entry.target);
        this._observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: this.intersectMargin,
      threshold: this.intersectThreshold,
    });

    this._triggerIntersects.forEach((el) => this._observer.observe(el));
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

    // Toggle class or display based on loading state
    if (this._loadingElement && this.loadingClass) {
      const classes = this.loadingClass.split(' ');
      classes.forEach((cls) => this._loadingElement.classList.toggle(cls, this._loading));
    } else if (this._loadingElement) {
      this._loadingElement.style.display = this._loading ? 'block' : 'none';
    }

    // Emit loading events
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
            targetElement.replaceChildren(sectionElement);
            break;
        }
      });
    } catch (error) {
      console.error(error);
    }
  }
}

customElements.define('liquid-section-renderer', LiquidSectionRenderer);
