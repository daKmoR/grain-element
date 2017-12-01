import GrainElement from '../GrainElement.js';

class GrainElementExample extends GrainElement {
  static get properties() {
    return {
      header: {
        type: 'String',
        value: 'Init name',
        observer: '_headerCalled',
        reflectToAttribute: 'header',
      },
      typeName: {
        type: 'String',
        value: 'warning',
        reflectToAttribute: 'type-name',
      },
      myOptions: {
        type: 'Json',
        value: { a: 'av' },
        reflectToAttribute: 'my-options',
      },
      myFlag: {
        type: 'Boolean',
        value: false,
        reflectToAttribute: 'my-flag',
      }
    };
  }

  _headerCalled(newValue) {
    // on the first initial change only properties in order before you are set
    // already set: type, header; still undefined: more, items
    // any other change afterwards can access everything
    // eslint-disable-next-line
    console.log(`header on ${this.localName}.${this.typeName} has been updated to ${newValue}`);
  }

  _render() {
    this.innerText = `My tag is now
      <grain-element-example
        header="${this.getAttribute('header')}"
        type-name="${this.getAttribute('type-name')}"
        my-options="${this.getAttribute('my-options')}"
        my-flag="${this.getAttribute('my-flag')}"
      ></grain-element-example>

      this.header: ${this.header}
      this.typeName: ${this.typeName}
      this.myOptions: ${JSON.stringify(this.myOptions)}
      this.myFlag: ${this.myFlag}
    `;
  }
}

customElements.define('grain-element-example', GrainElementExample);
