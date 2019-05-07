/*
Licensed under the CC0 1.0 Universal License by Emre Yeniay
Source and license files are available at https://github.com/eyny/alterjx

A javascript class written in ES6 to convert JSON, JS, DOM and XML data to each other.
An example usage can be seen as this:
  var alterJX = new AlterJX();
  alterJX.toJSON(myXMLString);
*/

class AlterJX {

  /**************************************************************************
  *                                                                         *
  * Public Fields and Methods                                               *
  *                                                                         *
  **************************************************************************/

  constructor(indentSize = 2) {
    this._indentSize = indentSize;
  }
  get indentSize() {
    return this._indentSize;
  }
  set indentSize(indentSize) {
    this._indentSize = indentSize;
  }

  toJSON(src) {
    switch (this._checkDataType(src)) {
      case this._dataType.JSON:
        return src;
      case this._dataType.JS:
        return this._JStoJSON(src);
      case this._dataType.DOM:
        return this._JStoJSON(this._DOMtoJS(src));
      case this._dataType.XML:
        return this._JStoJSON(this._DOMtoJS(this._XMLtoDOM(src)));
      case this._dataType.UNKNOWN:
        throw this._unknownTypeError;
    }
  }

  toJS(src) {
    switch (this._checkDataType(src)) {
      case this._dataType.JSON:
        return this._JSONtoJS(src);
      case this._dataType.JS:
        return src;
      case this._dataType.DOM:
        return this._DOMtoJS(src);
      case this._dataType.XML:
        return this._DOMtoJS(this._XMLtoDOM(src));
      case this._dataType.UNKNOWN:
        throw this._unknownTypeError;
    }
  }

  toDOM(src) {
    switch (this._checkDataType(src)) {
      case this._dataType.JSON:
        return this._JStoDOM(this._JSONtoJS(src));
      case this._dataType.JS:
        return this._JStoDOM(src);
      case this._dataType.DOM:
        return this.src;
      case this._dataType.XML:
        return this._XMLtoDOM(src);
      case this._dataType.UNKNOWN:
        throw this._unknownTypeError;
    }
  }

  toXML(src) {
    switch (this._checkDataType(src)) {
      case this._dataType.JSON:
        return this._DOMtoXML(this._JStoDOM(this._JSONtoJS(src)));
      case this._dataType.JS:
        return this._DOMtoXML(this._JStoDOM(src));
      case this._dataType.DOM:
        return this._DOMtoXML(src);
      case this._dataType.XML:
        return src;
      case this._dataType.UNKNOWN:
        throw this._unknownTypeError;
    }
  }

  /**************************************************************************
  *                                                                         *
  * Private Fields and Methods                                              *
  *                                                                         *
  **************************************************************************/

  // Const enumerable
  get _dataType() {
    return {
      UNKNOWN: -1,
      JSON: 0,
      JS: 1,
      DOM: 2,
      XML: 3
    };
  }

  // Const string
  get _unknownTypeError() {
    return 'Error: unknown data type';
  }

  // Method to check the type of the source data
  _checkDataType(src) {
    if (typeof src == 'string') {
      if (src.charAt(0) === '{') {
        return this._dataType.JSON;
      }
      else if (src.charAt(0) === '<') {
        return this._dataType.XML;
      }
      else {
        return this._dataType.UNKNOWN;
      }
    }
    else if (src.nodeType > 1) {
      return this._dataType.XML;
    }
    else if (typeof src == 'object') {
      return this._dataType.JS;
    }
    else {
      return this._dataType.UNKNOWN;
    }
  }

  // Method to beautify XML string
  _beautifyXML(srcString) {
    let indentSize = this.indentSize;
    if (indentSize <= 0) {
      return srcString;
    }
    else {
      let finalString = '';
      let totalIndent = '';
      srcString.split(/>\s*</).forEach(function (row) {
        if (row.match(/^\/\w/)) {
          totalIndent = totalIndent.slice(indentSize);
        }
        finalString += totalIndent + '<' + row + '>\r\n';
        if (row.match(/^<?\w[^>]*[^\/]$/)) {
          totalIndent += ' '.repeat(indentSize);
        }
      });
      return finalString.slice(1, finalString.length - 3);
    }
  }

  /****** 8 Methods to Change Data Type ******/

  _JSONtoJS(src) {
    return JSON.parse(src);
  }

  _JStoDOM(data, dataName = null) {
    // If dataName is undefined or null
    if (dataName === null) {
      let innerName = Object.keys(data)[0];
      return this._JStoDOM(data[innerName], innerName);
    }
    // If data is an array
    if (Array.isArray(data)) {
      let docFrag = document.createDocumentFragment();
      for (let item of data) {
        docFrag.appendChild(this._JStoDOM(item, dataName));
      }
      return docFrag;
    }

    // If the data is a textnode
    if (dataName === "#text") {
      return document.createTextNode(data);
    }

    // The element to be returned
    let element = document.createElement(dataName);

    // If the data is an element but not an object
    if (data !== Object(data)) {
      element.appendChild(document.createTextNode(data));
      return element;
    }

    // If the data is an object
    Object.keys(data).map(key => {
      let value = data[key];

      // If the entry defines a DOM attribute
      if (key.charAt(0) == '@') {
        element.setAttribute(key.substring(1), value);
      }

      // If the entry is an element
      else {
        element.appendChild(this._JStoDOM(value, key));
      }
    });
    return element;
  }

  _DOMtoXML(src) {
    let XMLserializer = new XMLSerializer();
    let XMLstring = XMLserializer.serializeToString(src);
    XMLstring = XMLstring.replace(' xmlns="http://www.w3.org/1999/xhtml"', '');
    XMLstring = this._beautifyXML(XMLstring);
    return XMLstring;
  }

  _XMLtoDOM(src) {
    let XMLparser = new DOMParser();
    return XMLparser.parseFromString(src, "text/xml");
  }

  _DOMtoJS(srcDOM) {

    let children = [...srcDOM.children];
    let jsonResult = {};

    // If the DOM element has attributes
    if (srcDOM.nodeType === 1 && srcDOM.hasAttributes()) {
      for (let attribute of srcDOM.attributes) {
        jsonResult["@" + attribute.name] = attribute.value;
      }
    }

    // If there is no children
    if (children.length === 0) {
      if (srcDOM.hasAttributes()) {
        if (srcDOM.innerHTML.length !== 0) {
          jsonResult["#text"] = srcDOM.innerHTML;
        }
        return jsonResult;
      } else {
        return srcDOM.innerHTML;
      }
    }

    // Initializing object to be returned.   
    for (let child of children) {
      // Checking is child has siblings of same name
      let childIsArray = children.filter(eachChild => eachChild.nodeName === child.nodeName).length > 1;

      // If child is array, save the values as array, else as strings. 
      if (childIsArray) {
        if (jsonResult[child.nodeName] === undefined) {
          jsonResult[child.nodeName] = [this._DOMtoJS(child)];
        } else {
          jsonResult[child.nodeName].push(this._DOMtoJS(child));
        }
      } else {
        jsonResult[child.nodeName] = this._DOMtoJS(child);
      }
    }
    return jsonResult;
  }

  _JStoJSON(src) {
    return JSON.stringify(src, null, this.indentSize);
  }
}