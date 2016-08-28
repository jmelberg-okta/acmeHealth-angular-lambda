# acmehealth-spa
Single Page Application for API Access Management to be demonstrated at Oktane 2016.
## Build Instructions
Once the project is cloned, install [node.js](https://nodejs.org/en/download/) on your machine. Using [npm](https://nodejs.org/en/download/) install [http-server](https://www.npmjs.com/package/http-server).

    $ npm install http-server -g
    

**Usage:** `$ http-server [path] [options]`

Start the web server with `http-server`
    $ http-server [path] [options]
    
`[path]`is the root directory (e.g. `http-server acmehealth-spa/`)

**[Navigate](http://localhost:8080/)** to `http://localhost:8080/` to sign in.

####Update the `oktaconfig.js` file:

```javascript
angular
.module("OktaConfig", [])
.constant('OKTACONFIG', {
	baseUrl : "https://example.oktapreview.com/",
	id: "Jw1nyzbsNihSuOETY3R1",
	redirect: "http://localhost:8080",
	authUrl : '/oauth2/aus7xbiefo72YS2QW0h7/v1/authorize',
	id_scopes: [
		'openid',
		'email',
		'profile',
		'groups'
		],
	access_scopes: [
		'appointments:read',
		'appointments:cancel',
		'appointments:edit',
		'appointments:confirm'
		]
});

```

