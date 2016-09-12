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

