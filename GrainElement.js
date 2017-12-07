export default class GrainElement extends HTMLElement {
  static get properties() {
    return {};
  }

  static get observedAttributes() {
    const { properties } = this;
    if (typeof properties !== 'object') {
      console.warn('Properties should be an object');

      return [];
    }

    return Object
      .keys(properties)
      .filter(property => this._isReflectToAttributeValid(properties[property]))
      .map(property => properties[property].reflectToAttribute);
  }

  static overrideDefaultPropertyValues(properties) {
    this._overrideValues = properties;
  }

  static _isReflectToAttributeValid(propertyOptions) {
    return propertyOptions &&
      typeof propertyOptions.reflectToAttribute === 'string' &&
      propertyOptions.reflectToAttribute !== '';
  }

  static _assertReflectToAttributeTypeSupported(property, type) {
    const supportedTypes = ['Json', 'String', 'Boolean', 'Number'];
    if (supportedTypes.indexOf(type) === -1) {
      console.warn(`${this.name}: reflectToAttribute only supports ${supportedTypes.join(', ')}.
        "${type}" found for property "${property}".`);
    }
  }

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
      // initializes all properties
      Object.keys(this._propertiesCache).forEach((property) => {
        const propertyOptions = this._propertiesCache[property];
        if (typeof propertyOptions === 'object') {
          this._initProperty(property, propertyOptions);
        } else {
          console.warn(
            `${this.constructor.name}: a property options should be an object.`,
            `"${typeof propertyOptions}" found for property "${property}"`,
          );
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

    this.connectedUpdate();
  }

  connectedUpdate() {
    this.update();
  }

  overrideSupport(properties) {
    // since properties is a getter, it's possible to just assign a result property
    // and it will create a copy of the properties
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
      const newPropertyValue = this._getAttribute(property, newValue);
      if (this.__data[property] !== newPropertyValue) {
        this._setProperty(property, newPropertyValue);
      }
    }
  }

  _getAttribute(property, currentValue) {
    const { type, reflectToAttribute } = this._propertiesCache[property];
    let gettingValue = currentValue || this.getAttribute(property);
    if (type === 'Boolean') {
      gettingValue = this.hasAttribute(reflectToAttribute);
    }
    if (type === 'Number') {
      gettingValue = gettingValue ? parseInt(gettingValue, 10) : undefined;
    }
    if (type === 'Json') {
      gettingValue = gettingValue ? JSON.parse(gettingValue.replace(/'/g, '"')) : undefined;
    }
    return gettingValue;
  }

  _setAttribute(property, newValue) {
    const { type, reflectToAttribute } = this._propertiesCache[property];
    let settingValue = newValue;
    if (type === 'Boolean') {
      settingValue = settingValue === false ? undefined : '';
    }
    if (type === 'Json') {
      settingValue = newValue ? JSON.stringify(newValue).replace(/"/g, "'") : undefined;
    }
    // attribute change will trigger attributeChangedCallback so no need to set data yourself
    // undefined for an attribute value means it can be removed
    if (typeof settingValue === 'undefined') {
      this.removeAttribute(reflectToAttribute);
    } else {
      this.setAttribute(reflectToAttribute, settingValue);
    }
  }

  _initProperty(propertyName, propertyOptions) {
    this._createGetterSetterForObject(propertyName, propertyOptions);

    if ('reflectToAttribute' in propertyOptions) {
      this._createReflectToAttribute(propertyName, propertyOptions);
    }

    if ('observer' in propertyOptions) {
      this._createObserver(propertyName, propertyOptions);
    }

    if ('value' in propertyOptions) {
      this._setDefaultValue(propertyName, propertyOptions);
    }
  }

  _createGetterSetterForObject(property) {
    if (property in this) {
      // property is already defined
      return;
    }

    Object.defineProperty(this, property, {
      get() {
        return this.__data[property];
      },
      set(newValue) {
        const oldValue = this.__data[property];
        if (oldValue !== newValue) {
          const propertyOptions = this._propertiesCache[property];
          if (this.connected && this.__attributeToProperty[propertyOptions.reflectToAttribute]) {
            this._setAttribute(property, newValue);
          } else {
            this._setProperty(property, newValue);
          }
        }
      },
    });
  }

  _createReflectToAttribute(property, propertyOptions) {
    if (this.constructor._isReflectToAttributeValid(propertyOptions)) {
      this.constructor._assertReflectToAttributeTypeSupported(property, propertyOptions.type);

      this.__attributeToProperty[propertyOptions.reflectToAttribute] = property;
    } else {
      console.warn(
        `${this.constructor.name}: reflectToAttribute should be a non-empty string.`,
        `"${typeof propertyOptions.reflectToAttribute}" found for property "${property}"`,
      );
    }
  }

  _createObserver(property, { observer }) {
    if (this[observer]) {
      this._observerMethods[property] = this[observer];
    } else {
      console.warn(
        `${this.constructor.name}:`,
        `method "${observer}" not found for property "${property}"`,
      );
    }
  }

  _setDefaultValue(property, propertyOptions) {
    this[property] = (typeof propertyOptions.value === 'function')
      ? propertyOptions.value()
      : propertyOptions.value;
  }

  _setProperty(property, newValue) {
    const oldValue = this.__data[property];
    this.__data[property] = newValue;
    this._propertiesChanged(property, newValue, oldValue);
  }

  _propertiesChanged(property, newValue, oldValue) {
    if (this._observerMethods[property]) {
      this._observerMethods[property].call(this, newValue, oldValue);
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
