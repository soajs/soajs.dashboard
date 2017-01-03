## swagger-editor

Simple UI for swagger json editor. Prepare your swagger json as per
the specifications mentioned by Swagger. For more reference on
swagger doc specification go to
https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md.

## Installation

``sh
$ bower install swagger-editor
``

## Dependencies
[angular](http://github.com/angular/angular.js)
[jquery](http://jquery.com)
[bootstrap.js](http://getbootstrap.com)

## Usage

```javascript
// Inject the module
angular.module("YourModule", [
  'swagger-editor'
]);
```

```html
<swagger-editor doc="swaggerJson"></swagger-editor>
```

## Development

Clone the repo, make sure you have [npm](https://www.npmjs.org/),
[bower](http://bower.io/) and [grunt](http://gruntjs.com/) installed.

``sh
$ npm install
$ python -m SimpleHTTPServer
``

Open `http://localhost:8000`

## License

APACHE 2.0
