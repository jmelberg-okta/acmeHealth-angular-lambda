/** Author: Jordan Melberg */
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

var app = angular.module("app", ["ngRoute", "OktaAuthClient", "ApiClient", "OktaConfig"] );
app.config(function ($routeProvider) {
	$routeProvider
	.when("/", {
		templateUrl: "views/schedule.html",
		controller: "ScheduleController"
	})
	.when("/login", {
		templateUrl: "views/login.html",
		controller: "LoginController",
	})
	.when("/requests", {
		templateUrl: "views/requests.html",
		controller: "RequestsController"
	})
	.otherwise({redirectTo: "/"});
});

/**
 *	Assign "oktaClient" and "oktaAuth" as two global constants shared
 *	between controllers.
 *	
 *	Run the "authClient" config with defined args
 */
app.value("oktaClient", undefined);
app.value("oktaAuth", undefined);

app.run(function(authClient, OKTACONFIG){
	oktaClient = authClient.create({
		baseUrl: OKTACONFIG.baseUrl,
		id: OKTACONFIG.id,
		redirect: OKTACONFIG.redirect
	});
	oktaAuth = authClient;
});

/** Returns Month (September) from Date Object */
var getMonthFromDate = function(dateObject) {
	return dateObject.startTime.split('T')[0].split('-')[1];
}

/** Returns first appointment */
var getFirstAppointment = function(appointmentsJson) {
	for(var month in appointmentsJson) {
		if(appointmentsJson.hasOwnProperty(month)) {
			var date = appointmentsJson[month];
			for(var appt in date) {
				if(date.hasOwnProperty(appt)) {	
					return date[appt][0];	
				}
			}
		}
	}
}

/** Filter appointments by date and sorted by time */
var filterAppointments = function(appointmentData, date) {
	var dailyAppointments = [];
	angular.forEach(appointmentData, function(item) {
		if(item.startTime.split('T')[0] == date) { 		// Compare MM/DD/YYYY
			dailyAppointments.push(item);	
		}
	});
	return dailyAppointments;
}

/** Route: '/' */
app.controller("ScheduleController",
	function($scope, $window, $location, $timeout, $route, $rootScope, authClient, apiClient) {
		$rootScope.layout = "page-Schedule has-sidebar";

		var tokenManager = authClient.getClient().tokenManager;

		/** Check if authenticated - redirect to login if not */
		if(angular.isUndefined(tokenManager.get("idToken")) || angular.isUndefined(tokenManager.get("accessToken"))){
			$location.url("/login"); 
		}

		/** Get current idToken */
		$scope.idToken = tokenManager.get("idToken");

		/** Get appointments */
		var confirmedAppointments = getConfirmedAppointments();
		function getConfirmedAppointments() {
			apiClient.getAppointments(tokenManager.get("accessToken").accessToken, tokenManager.get("idToken").claims.sub)
			.then(function(appointments) {
				var appointmentJSON = JSON.parse(appointments);
				var confirmedAppointmentsList = [];
				angular.forEach(appointmentJSON, function(item){
					if(item.status == "CONFIRMED") {
						confirmedAppointmentsList.push(item);
					}
				});
				if (confirmedAppointmentsList.length > 0) {
					// Store confirmed appointments
					parseConfirmedAppointments(confirmedAppointmentsList);
					$window.localStorage["appointments"] = angular.toJson(confirmedAppointmentsList);
					return angular.toJson(confirmedAppointmentsList);
				}
				return;
			}, function (err) {
				console.error(err);
				return;
			});
		}
		
		/**
		 *	Format all confirmed appointments into JSON following data structure:
		 *	
		 *	Example:
		 *  {
		 *		 September : {
		 *			2016-09-01 : [
		 *				appointmentJSON,
		 *				appointmentJSON
		 *			],
		 *			2016-09-15 : [
		 *				appointmentJSON,
		 *				appointmentJSON
		 *			]
		 *		 },
		 *		 October : {
		 *			2016-10-05 : [
		 *				appointmentJSON,
		 *				appointmentJSON
		 *			]
		 *		}
		 *	 }
		 *
		 */
		function parseConfirmedAppointments(confirmedAppointments) {
			var appointmentsByDate = {}
			angular.forEach(confirmedAppointments, function(item) {
				var months = [
					"January", "February", "March",
					"April", "May", "June", "July", "August",
					"September", "October", "November", "December"
				];
				var month = getMonthFromDate(item); // Returns Month as text 'September'
				var date = item.startTime.split('T')[0].split('-');
				
				if(!appointmentsByDate[months[month-1]]){
					appointmentsByDate[months[month-1]] = {};
				}
				if(!appointmentsByDate[months[month-1]][item.startTime.split('T')[0]]){
					appointmentsByDate[months[month-1]][item.startTime.split('T')[0]] = [];
				}
				appointmentsByDate[months[month-1]][item.startTime.split('T')[0]].push(item);
			});
			var firstAppt = getFirstAppointment(appointmentsByDate);
			var setInitialApptView = filterAppointments(confirmedAppointments, firstAppt.startTime.split('T')[0]);
			$scope.appointments = setInitialApptView;
			$scope.sorted = appointmentsByDate;	
		}

		/** Updates appointment list when date is selected */
		$scope.updateAppointmentList = function(date) {
			var appointments = !angular.isUndefined($window.localStorage["appointments"]) ? JSON.parse($window.localStorage["appointments"]) : undefined;
			$scope.appointments = filterAppointments(appointments, date);
		}

		/**	Clears the localStorage saved in the web browser and scope variables */
		function clearStorage(){
			$window.localStorage.clear();
			authClient.getClient().tokenManager.clear();
			$scope = $scope.$new(true);
		}

		/**	Signout method called via button selection */
		$scope.signout = function() {
			$timeout(function() {
				oktaAuth.signout()
				.then(function(res){
					clearStorage();
					console.log(res);
					$location.url("/login");
				}, function(err){
					console.log(err);
				});
			}, 100);
		}

});

/** Route '/requests' */
app.controller("RequestsController",
	function($scope, $window, $route, $location, $timeout, $rootScope, authClient, apiClient, OKTACONFIG) {
		$rootScope.layout = "page-Requests";
		
		/** Get Token Manager */
		var tokenManager = authClient.getClient().tokenManager;
		$scope.idToken = tokenManager.get("idToken");
		
		/** Refresh idToken to check for 'groups' */
		getRequests();
		function getRequests() {
			authClient.renewIdToken(OKTACONFIG.id_scopes)
			.then(function(idToken) {
				tokenManager.refresh("idToken", idToken.idToken);
								
				/** Get all appointments with 'Requested' status */
				var requestedAppointments = getRequestedAppointments();

				function getRequestedAppointments() {
					apiClient.getAppointments(tokenManager.get("accessToken").accessToken, tokenManager.get("idToken").claims.sub)
					.then(function(appointments) {
						var appointmentJSON = JSON.parse(appointments);
						var pendingAppointments = [];
						
						/** Get all requested appointments */
						angular.forEach(appointmentJSON, function(item){
							if(item.status == "REQUESTED") {
								pendingAppointments.push(item);
							}
						});

						if (pendingAppointments.length > 0) {
							$scope.requests = pendingAppointments
							return pendingAppointments;
						} else {
							$scope.requests = [];
						}
						return;

					}, function (err) {	console.error(err);});
				}
			});
		}

		/** Cancel Appointment (Provider ONLY) */
		$scope.cancelAppointment = function(appointment) {
			var cancel = apiClient.cancelAppointment(appointment, authClient.getClient().tokenManager.get("accessToken").accessToken);
			console.log(tokens.accessToken.accessToken);
			cancel.then(function(res) {
				getRequests();
			}, function(error) {
				console.error(error);
			});
		}

		/** Delete Appointment (Patient ONLY) */
		$scope.deleteAppointment = function(appointment) {
			var deleteAppt = apiClient.deleteAppointment(appointment, authClient.getClient().tokenManager.get("accessToken").accessToken);
			deleteAppt.then(function(res) {
				getRequests();
			}, function(error) {
				console.error(error);
			});
		}

		/** Confirm Appointment (Provider ONLY) */
		$scope.confirmAppointment = function(appointment) {
			var confirm = apiClient.confirmAppointment(appointment, authClient.getClient().tokenManager.get("accessToken").accessToken);
			confirm.then(function(res) {
				getRequests();
			}, function(error) {
				console.error(error);
			});
		}

		/**	Clears the localStorage saved in the web browser and scope variables */
		function clearStorage(){
			$window.localStorage.clear();
			authClient.getClient().tokenManager.clear();
			$scope = $scope.$new(true);
		}

		/**	Signout method called via button selection */
		$scope.signout = function() {
			$timeout(function() {
				oktaAuth.signout()
				.then(function(res){
					clearStorage();
					console.log(res);
					$location.url("/login");
				}, function(err){
					console.log(err);
				});
			}, 100);
		}
});

/**
 *	Authenticates the user with custom login UI using AuthSDK
 *
 * 	Stores the response object in localStorage and sets the current session to true
 */
app.controller("LoginController",
	function($scope, $location, $timeout, $rootScope, authClient, apiClient, OKTACONFIG ){
		var tokenManager = authClient.getClient().tokenManager;

		if(!angular.isUndefined(tokenManager.get("idToken"))){
			$location.url("/");
		}
		$rootScope.layout = 'page-Login';

		$scope.authenticate = function(user) {
			var res = authClient.login(user.email, user.password);
			res.then(function(res){
				
				var options = {
					'token' : res.sessionToken,
					'responseType' : 'id_token', 
					'scopes' : OKTACONFIG.id_scopes
				};

				/** Get idToken and accessToken */
				var tokens = authClient.getIdToken(options);
				tokens.then(function(idTokenResult) {
					/** Get accessToken from custom authorization server */
					tokenOptions = {
						url : OKTACONFIG.baseUrl,
						issuer: OKTACONFIG.authUrl,
						authUrl: "https://example.oktapreview.com/oauth2/aus8p24lycw4wg8Eg0h7/v1/authorize",
						responseType : 'token',
						id: OKTACONFIG.id,
						redirect : OKTACONFIG.redirect,
						scopes: OKTACONFIG.access_scopes
					}
					authClient.getAccessToken(tokenOptions).then(function(result){
						console.log("Retrieved both tokens\n", result, "\n", idTokenResult);
						tokenManager.add("idToken", idTokenResult);
						tokenManager.add("accessToken", result);
						$location.url('/');
					}, function(error) { console.error(error); });
				}, function(err) { console.error(err); });		
			}, function(err) {console.error(err)});
		};
});




