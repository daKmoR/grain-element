import GrainElement from '../GrainElement.js';

class GrainElementExample extends GrainElement {
  static get properties() {
    return {
      header: {
        type: String,
        value: 'Init name',
        observer: '_headerCalled',
        reflectToAttribute: 'header',
      },
      typeName: {
        type: String,
        value: 'warning',
        reflectToAttribute: 'type-name',
      },
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
        header="${this.header}"
        type-name="${this.typeName}">
      </grain-element-example>`;
  }

}

customElements.define('grain-element-example', GrainElementExample);
