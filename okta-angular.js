/* 	Author: Jordan Melberg */
/** Copyright © 2016, Okta, Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 

/**
 *	Custom Angular Wrapper for the Okta AuthSDK
 *
 *	To Use:
 * 		Inject "OktaAuthClient" into your modules,
 *		followed by "authClient" in your controllers, directives,
 *		etc. if using a custom login form
 */

angular
.module("OktaAuthClient", [])
.factory("authClient", function($q, $timeout, $http) {
	var auth;

	/**	Creates the Okta Authentication binding */
	var create = function(options) {
		auth = new OktaAuth({
			url: options.baseUrl,
			clientId : options.id,
			redirectUri: options.redirect
		});
		return auth;
	};

	/**
	 *	Uses the Okta AuthSDK to establish a session given
	 *	"username" and "password"	
	 */
	var login = function(email, password) {
		var deferred = $q.defer();
		auth.signIn({
			username: email,
			password: password
		})
		.then(function(transaction) {
			switch(transaction.status) {
				case "SUCCESS":
					var auth = angular.toJson({
						"user": email,
						"transaction": transaction
					});
					deferred.resolve({
						"auth" : auth,
						"session" : true,
						"sessionToken" : transaction.sessionToken
					});
				default:
					deferred.reject({
						"Error" : "Cannot handle the " + transation.status + " status"
					});
			}
		})
		.fail(function(err) {
			deferred.reject({"Error" : err });
		});
		return deferred.promise;
	};

	/**
	 *	Given a sessionToken, returns "idToken" and/or "accessToken",
	 *	and user "clams"
	 */
	var getIdToken = function(options) {
		var deferred = $q.defer();
		if(auth.session.exists()){
			auth.token.getWithoutPrompt({
				sessionToken: options.token,
				responseType : options.responseType,
				scopes : options.scopes
			}).then(function(res) {
				deferred.resolve(res);
			});
		} else {
			console.log("No session");
		}
		return deferred.promise;
	}

	/** Retrieves accessToken creating new authJS object */
	var getAccessToken = function(options) {
		var tokenAuth = new OktaAuth({
			url: options.url,
			clientId : options.id,
			redirectUri: options.redirect,
			authorizationUrl : options.authUrl
		});
		var deferred = $q.defer();
		var accessToken = tokenAuth.token.getWithoutPrompt({
			responseType : options.responseType,
			scopes : options.scopes
		});
		accessToken.then(function(res) {
			deferred.resolve(res);
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	}

	/**	Refreshes the current session */
	var refreshSession = function() {
		var deferred = $q.defer();
		auth.session.exists()
		.then(function(res) {
			if(res == true) {
				auth.session.refresh()
				.then(function(success){
					deferred.resolve(success);
				});
			}
		})
		.fail(function(err){deferred.reject(err);});
		return deferred.promise;
	}

	/** 	Closes the current session  */
	var closeSession = function() {
		var deferred = $q.defer();
		auth.session.close()
		.finally(function(){
			deferred.resolve("Closed Session");
		})
		.fail(function(err){deferred.reject(err);});
		return deferred.promise;
	}

	/**	Renews the current ID token */
	var renewIdToken = function(options) {
		var scopes = {'scopes' : options};
		var deferred = $q.defer();
		auth.idToken.refresh(scopes)
		.then(function(res) {
			deferred.resolve({
				"idToken" : res
			});
		})
		.fail(function(err){deferred.reject(err);});
		return deferred.promise;
	}

	/**
	 *	Given an "idToken" or "accessToken", it decodes the
	 *	header, payload, and signiture
	 */
	var decodeIdToken = function(token) {
		var deferred = $q.defer();
		var decoded = auth.idToken.decode(token);
		if (!angular.isUndefined(decoded)){
			deferred.resolve(decoded);
		} else {
			deferred.reject(token);
		}
		return deferred.promise;
	}

	/**	Logs the user out of the current session */
	var signout = function() {
		var deferred = $q.defer();
		auth.session.exists()
		.then(function(exists){
			if(exists) {	auth.signOut();	}
			deferred.resolve("Signed out");
		})
		.fail(function(err){
			deferred.reject(err);
		});
		return deferred.promise;
	}

	var getClient = function() {
		return auth;
	}

	/**
	 *	Return functions
	 */
	return {
		create : create, 
		login : login,
		getIdToken : getIdToken,
		getAccessToken : getAccessToken,
		refreshSession : refreshSession,
		closeSession : closeSession,
		renewIdToken : renewIdToken,
		decodeIdToken : decodeIdToken,
		signout : signout,
		getClient : getClient
	}
});