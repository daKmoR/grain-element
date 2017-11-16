export default class GrainElement extends HTMLElement {
  constructor() {
    super();
    this.__data = {};
    this.__attributeToProperty = {};
    this._observerMethods = {};

    const { properties } = this.constructor;
    this._wait = true;
    if (typeof properties === 'object') {
      this._propertiesCache = this.overrideSupport(this.constructor.properties);
      // create getters and setters
      Object.keys(this._propertiesCache).forEach((property) => {
        const propertyOptions = this._propertiesCache[property];
        if (typeof propertyOptions === 'object') {
          this._makeGetterSetterForObject(property, propertyOptions);
        } else {
          console.warn(`${this.localName}: the property ${property} should be an object.`);
        }
      });
    }
  }

  connectedCallback() {
    if (typeof super.connectedCallback === 'function') {
      super.connectedCallback();
    }

    // read attribute values
    Object.keys(this.__attributeToProperty).forEach((attributeName) => {
      const property = this.__attributeToProperty[attributeName];
      if (this.hasAttribute(attributeName)) {
        this[property] = this.getAttribute(attributeName);
      }
      this[property] = this[property];
    });
    delete this._wait;

    if (!this.manualFirstRender) {
      this.update();
    }
  }

  static get observedAttributes() {
    const { properties } = this;
    const attributes = [];
    if (typeof properties === 'object') {
      Object.keys(properties).forEach((property) => {
        const propertyOptions = properties[property];
        if (propertyOptions && typeof propertyOptions.reflectToAttribute === 'string' && propertyOptions.reflectToAttribute !== '') {
          attributes.push(propertyOptions.reflectToAttribute);
        }
      });
    }
    return attributes;
  }

  static overrideDefaultPropertyValues(properties) {
    this._overrideValues = properties;
  }

  overrideSupport(properties) {
    const result = properties;
    if (typeof this.constructor._overrideValues === 'object') {
      Object.keys(this.constructor._overrideValues).forEach((property) => {
        result[property].value = this.constructor._overrideValues[property];
      });
    }
    return result;
  }

  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (typeof super.attributeChangedCallback === 'function') {
      super.attributeChangedCallback();
    }
    if (this.__attributeToProperty[attributeName]) {
      const property = this.__attributeToProperty[attributeName];
      if (this[property] !== newValue) {
        this._set(property, newValue, oldValue);
      }
    }
  }

  _set(property, newValue, oldValue) {
    const { type, reflectToAttribute } = this._propertiesCache[property];
    if (type.name === 'Boolean') {
      if (newValue !== 'false') {
        this.__data[property] = this.hasAttribute(reflectToAttribute);
      } else {
        this.__data[property] = false;
      }
    } else {
      this.__data[property] = type(newValue);
    }
    this._propertiesChanged(property, newValue, oldValue);
  }

  static _hasValidReflectToAttribute(propertyOptions) {
    return (propertyOptions && typeof propertyOptions.reflectToAttribute === 'string' && propertyOptions.reflectToAttribute !== '');
  }

  _makeGetterSetterForObject(property, propertyOptions) {
    if (this.constructor._hasValidReflectToAttribute(propertyOptions)) {
      this.__attributeToProperty[propertyOptions.reflectToAttribute] = property;
    }
    Object.defineProperty(this, property, {
      get() {
        if (this.constructor._hasValidReflectToAttribute(propertyOptions)) {
          if (propertyOptions.type === Object || propertyOptions.type === Array) {
            console.warn('reflectToAttribute does not support Object or array');
          }
        }
        return this.__data[property];
      },

      set(value) {
        const oldValue = this.__data[property];
        if (oldValue === value) {
          return;
        }
        if (this.constructor._hasValidReflectToAttribute(propertyOptions)) {
          if (propertyOptions.type === Object || propertyOptions.type === Array) {
            console.warn('reflectToAttribute does not support Object or array');
          }
          // attribute change will trigger attributeChangedCallback so no need to set data yourself
          if (propertyOptions.type === Boolean) {
            value = value === false ? undefined : '';  //eslint-disable-line
          }
          if (typeof value === 'undefined') {
            this.removeAttribute(propertyOptions.reflectToAttribute);
          } else {
            this.setAttribute(propertyOptions.reflectToAttribute, value);
          }
        } else {
          this.__data[property] = value;
          this._propertiesChanged(property, value, oldValue);
        }
      },
    });

    if (propertyOptions.observer) {
      if (this[propertyOptions.observer]) {
        this._observerMethods[property] = this[propertyOptions.observer].bind(this);
      } else {
        console.warn(`Method ${propertyOptions.observer} not defined!`);
      }
    }
    // set default values
    if (typeof propertyOptions.value !== 'undefined') {
      const newValue = (typeof propertyOptions.value === 'function') ? propertyOptions.value() : propertyOptions.value;
      if (this.constructor._hasValidReflectToAttribute(propertyOptions)) {
        this._set(property, newValue);
      } else {
        this[property] = newValue;
      }
    }
  }

  _propertiesChanged(property, value, oldValue) {
    if (this._observerMethods[property]) {
      this._observerMethods[property](value, oldValue);
    }
    if (!this._wait) {
      this.update();
    }
  }

  /**
   * Batches renderings which gives a HUGE performance boost.
   *
   * Example:
   *   render() { return html`<my-element a=${a} b=${b} c=${c}><my-element>`; }
   *
   * without async it will result in 3 renders. e.g. a changed render, b changed render...
   * with async it will be 1 render no matter how many properties changed
   */
  async update() {
    if (!this.needsRender) {
      this.needsRender = true;
      await 0;
      this.needsRender = false;
      this._render(this.render(), this.renderTarget);
    }
  }

  render() { // eslint-disable-line
    /* override this in your element implementation */
  }


  _render() { // eslint-disable-line
    /* override this in your element implementation */
  }
}
