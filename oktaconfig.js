angular
.module("OktaConfig", [])
.constant('OKTACONFIG', {
	baseUrl : "https://example.oktapreview.com/",
	id: "GJv1mKQtUAUbTalBeQLs",
	redirect: "http://localhost:8080",
	authUrl : '/oauth2/aus80l8xhvgeoUgwr0h7/v1/authorize',
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


