angular
.module("OktaConfig", [])
.constant('OKTACONFIG', {
	baseUrl : "https://example.oktapreview.com/",
	id: "GJv1mKQtUAUbTalBeQLs",
	redirect: "http://localhost:3000",
	authUrl : "https://example.oktapreview.com/oauth2/aus8p24lycw4wg8Eg0h7/",
	apiUrl: "https://z12esvqjs7.execute-api.us-east-1.amazonaws.com/dev",
	id_scopes: [
		'openid',
		'email',
		'profile',
		'groups'
		],
	access_scopes: [
		"appointments:read",
        "appointments:write",
        "appointments:cancel",
        "providers:read"
	]
});


