export default class GrainElement extends HTMLElement {
  constructor() {
    super();
    this.__data = {};
    this.__attributeToProperty = {};
    this._observerMethods = {};
    this.connected = false;

    const { properties } = this.constructor;
    this.allPropertiesSetup = false;
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
    this.connected = true;
    // read attribute values
    Object.keys(this.__attributeToProperty).forEach((attributeName) => {
      const property = this.__attributeToProperty[attributeName];
      if (this.hasAttribute(attributeName)) {
        this[property] = this._getAttribute(property);
      } else {
        this._setAttribute(property, this[property]);
      }
    });
    this.allPropertiesSetup = true;

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
    if (oldValue !== newValue && this.__attributeToProperty[attributeName]) {
      const property = this.__attributeToProperty[attributeName];
      if (this[property] !== newValue) {
        let settingValue = this._getAttribute(property, newValue);
        this.__data[property] = settingValue;
        this._propertiesChanged(property, settingValue, oldValue);
      }
    }
  }

  static _hasValidReflectToAttribute(propertyOptions) {
    return (propertyOptions && typeof propertyOptions.reflectToAttribute === 'string' && propertyOptions.reflectToAttribute !== '');
  }

  _getAttribute(property, currentValue) {
    const { type, reflectToAttribute } = this._propertiesCache[property];
    if (['Json', 'String', 'Boolean'].indexOf(type) === -1) {
      console.warn("reflectToAttribute only support 'String', 'Json' and 'Boolean'.", this._propertiesCache[property]);
    }
    let gettingValue = currentValue || this.getAttribute(property);
    if (type === 'Boolean') {
      gettingValue = this.hasAttribute(reflectToAttribute);
    }
    if (type === 'Json') {
      gettingValue = JSON.parse(gettingValue.replace(/'/g, '"'));
    }
    return gettingValue;
  }

  _setAttribute(property, newValue) {
    const { type, reflectToAttribute } = this._propertiesCache[property];
    if (['Json', 'String', 'Boolean'].indexOf(type) === -1) {
      console.warn("reflectToAttribute only support 'String', 'Json' and 'Boolean'.",
        this._propertiesCache[property]);
    }
    let settingValue = newValue;
    if (type === 'Boolean') {
      settingValue = settingValue === false ? undefined : '';
    }
    if (type === 'Json') {
      settingValue = JSON.stringify(newValue).replace(/"/g, "'");
    }
    // attribute change will trigger attributeChangedCallback so no need to set data yourself
    if (typeof settingValue === 'undefined') {
      this.removeAttribute(reflectToAttribute);
    } else {
      this.setAttribute(reflectToAttribute, settingValue);
    }
  }

  _makeGetterSetterForObject(property, propertyOptions) {
    if (this.constructor._hasValidReflectToAttribute(propertyOptions)) {
      this.__attributeToProperty[propertyOptions.reflectToAttribute] = property;
    }
    Object.defineProperty(this, property, {
      get() {
        if (this.constructor._hasValidReflectToAttribute(propertyOptions)) {
          if (['Json', 'String', 'Boolean'].indexOf(propertyOptions.type) === -1) {
            console.warn("reflectToAttribute only support 'String', 'Json' and 'Boolean'.", propertyOptions);
          }
        }
        return this.__data[property];
      },
      set(newValue) {
        const oldValue = this.__data[property];
        if (oldValue !== newValue) {
          if (this.connected &&
            this.constructor._hasValidReflectToAttribute(this._propertiesCache[property])) {
            this._setAttribute(property, newValue);
          } else {
            this.__data[property] = newValue;
            this._propertiesChanged(property, newValue, oldValue);
          }
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
      this[property] = (typeof propertyOptions.value === 'function') ? propertyOptions.value() : propertyOptions.value;
    }
  }

  _propertiesChanged(property, newValue, oldValue) {
    if (this._observerMethods[property]) {
      this._observerMethods[property](newValue, oldValue);
    }
    if (this.allPropertiesSetup === true) {
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
      this._render();
    }
  }

  _render() { // eslint-disable-line
    /* override this in your element implementation */
  }
}
