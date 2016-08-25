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

var app = angular.module("app", ["ngRoute", "OktaAuthClient", "ApiClient", "OktaConfig"]);
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
app.value("clientScopes", undefined);

app.run(function(authClient, OKTACONFIG){
	oktaClient = authClient.create({
		baseUrl: OKTACONFIG.baseUrl,
		id: OKTACONFIG.id,
		redirect: OKTACONFIG.redirect
	});
	oktaAuth = authClient;
});

// Formats date object into form MM/DD/YYYY
var toJsonDate = function(item) {
	var itemDate = item.startTime.split('T')[0].split('-');
	var month = itemDate[1];
	var day = itemDate[2];
	var year = itemDate[0];
	return month+"/"+day+"/"+year
}

// Returns next appointment
var getFirstAppointment = function(json) {
	for(var month in json) {
		if(json.hasOwnProperty(month)) {
			var date = json[month];
			for(var appt in date) {
				if(date.hasOwnProperty(appt)) {	return date[appt][0];	}
			}
		}
	}
}

// Filter appointments by date and sorted by time
var filterAppointments = function(appointmentData, date) {
	// Date format : MM/DD/YYYY
	var dailyAppointments = [];
	angular.forEach(JSON.parse(appointmentData), function(item) {
		var compareDate = item.startTime.split('T')[0];

		if(compareDate == date){
			dailyAppointments.push(item);	}
	});
	return dailyAppointments;
}

// Route: '/'
app.controller("ScheduleController",
	function($scope, $window, $location, $timeout, $route, $rootScope, apiClient) {
		$rootScope.layout = "page-Schedule has-sidebar";

		var auth = $window.localStorage["auth"];
		var session = $window.localStorage["session"];
		
		if(angular.isUndefined(auth) || angular.isUndefined(session)){
			$location.url("/login");
		}
		
		var tokens = !angular.isUndefined($window.localStorage["tokens"]) ? JSON.parse($window.localStorage["tokens"]) : undefined;
		$scope.tokens = tokens
		
		var id = tokens.idToken.claims.sub;
		var accessToken = tokens.accessToken.accessToken;
		
		// Get appointments
		apiClient.getAppointments(accessToken, id)
		.then(function(appointments) {
			var appointmentJSON = JSON.parse(appointments).data;
			var confirmedAppointments = [];
			angular.forEach(appointmentJSON, function(item){
				if(item.status == "CONFIRMED") {
					confirmedAppointments.push(item);
				}
			});
			if(appointmentJSON.length > 0) {
				$window.localStorage["appointments"] = angular.toJson(appointmentJSON);
			}
			if (confirmedAppointments.length > 0) {
				$window.localStorage["confirmedAppointments"] = angular.toJson(confirmedAppointments);
			}
		}, function (err) {
			console.error(err);
		});

		var confirmedAppointments = $window.localStorage["confirmedAppointments"];
		var appointmentData = $window.localStorage["appointments"];

		// Vars to init
		var appointments = undefined;
		var sorted = undefined;
		var completed = undefined;

		if(!angular.isUndefined(confirmedAppointments) && confirmedAppointments != "[]"){
			// Format appts
			var appointmentsByDate = {}
			angular.forEach(JSON.parse(confirmedAppointments), function(item) {
				var months = [
					"January", "February", "March",
					"April", "May", "June", "July", "August",
					"September", "October", "November", "December"
				];
				var jsonDate = toJsonDate(item);
				var date = item.startTime.split('T')[0].split('-');
				var month = jsonDate.split('/')[0];
				
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
			appointments = setInitialApptView;
			sorted = appointmentsByDate;	
			completed = true;	
		} else {
			appointments = confirmedAppointments;
			sorted = confirmedAppointments;
			completed = true;
		}

		// Update scope
		$scope.auth = !angular.isUndefined(auth) ? JSON.parse(auth) : undefined;
		$scope.session = session;
		$scope.tokens = tokens;
		if(angular.isUndefined(completed)){
			refresh(1000);
		}
		$scope.appointments = appointments != "[]" ? appointments : undefined;
		$scope.sorted = appointments != "[]" ? sorted : undefined;

		$scope.updateAppointmentList = function(date) {
			$scope.appointments = filterAppointments(confirmedAppointments, date);
		}

	  	/**	Refreshes the current page given time duration until refresh */
		function refresh(duration){
			setTimeout(function() {$route.reload();}, duration);
		}

		/**	Clears the localStorage saved in the web browser and scope variables */
		function clearStorage(){
			$window.localStorage.clear();
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

// Route '/requests'
app.controller("RequestsController",
	function($scope, $window, $route, $location, $timeout, $rootScope, authClient, apiClient, OKTACONFIG) {
		$rootScope.layout = "page-Requests";

		var auth = $window.localStorage["auth"];
		var session = $window.localStorage["session"];
		var tokens = !angular.isUndefined($window.localStorage["tokens"]) ? JSON.parse($window.localStorage["tokens"]) : undefined;
		$scope.tokens = tokens;

		// Refresh idToken to check for 'groups'
		authClient.renewIdToken(OKTACONFIG.id_scopes)
		.then(function(idToken) {
			$window.localStorage["tokens"] = angular.toJson({
				"accessToken" : tokens.accessToken,
				"idToken" : idToken.idToken
			});
			tokens = JSON.parse($window.localStorage["tokens"]);
			var id = tokens.idToken.claims.sub;
			var accessToken = tokens.accessToken.accessToken;
			var complete = undefined;

			// Get all appointments with 'Requested' status
			apiClient.getAppointments(accessToken, id)
			.then(function(appointments) {
				var appointmentJSON = JSON.parse(appointments).data;
				var pendingAppointments = [];
				angular.forEach(appointmentJSON, function(item){
					if(item.status == "REQUESTED") {
						pendingAppointments.push(item);
					}
				});
				if(appointmentJSON.length > 0) {
					$window.localStorage["appointments"] = angular.toJson(appointmentJSON);
				}
				if (pendingAppointments.length > 0) {
					$window.localStorage["pendingAppointments"] = angular.toJson(pendingAppointments);
				} else {
					$window.localStorage["pendingAppointments"] = null;
				}

			}, function (err) {	console.error(err);});

			// Display appointments not yet confirmed
			var pending = $window.localStorage["pendingAppointments"];
			var req = !angular.isUndefined(pending) ? JSON.parse(pending) : undefined;
			
			if(!angular.isUndefined(pending) || pending === null){
				$scope.requests = JSON.parse(pending);
				complete = true;
			} 

			$scope.tokens = tokens;
			$scope.auth = !angular.isUndefined(auth) ? JSON.parse(auth) : undefined;
			$scope.session = session;

			if(angular.isUndefined(complete)){
				refresh(100);
			}

		});

		// Cancel Appointment (Provider ONLY)
		$scope.cancelAppointment = function(appointment) {
			var cancel = apiClient.cancelAppointment(appointment, accessToken);
			cancel.then(function(res) {
				$timeout(function(){
					$route.reload();
				}, 1000);
			}, function(error) {
				console.error(error);
			});
		}

		// Delete Appointment (Patient ONLY)
		$scope.deleteAppointment = function(appointment) {
			var deleteAppt = apiClient.deleteAppointment(appointment, accessToken);
			deleteAppt.then(function(res) {
				$timeout(function(){
					$route.reload();
				}, 1000);
			}, function(error) {
				console.error(error);
			});
		}

		// Confirm Appointment (Provider ONLY)
		$scope.confirmAppointment = function(appointment) {
			var confirm = apiClient.confirmAppointment(appointment, accessToken);
			confirm.then(function(res) {
				$timeout(function(){
					$route.reload();
				}, 1000);
			}, function(error) {
				console.error(error);
			});
		}

		/**	Refreshes the current page given time duration until refresh */
		function refresh(duration){
			setTimeout(function() {$route.reload();}, duration);
		}

		/**	Clears the localStorage saved in the web browser and scope variables */
		function clearStorage(){
			$window.localStorage.clear();
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
	function($scope, $window, $location, $timeout, $rootScope, authClient, apiClient, OKTACONFIG){
		
		// Uncomment when real deal

		// if(!angular.isUndefined($window.localStorage["session"])){
		// 	$location.url("/");
		// }
		$rootScope.layout = 'page-Login';
		
		$scope.authenticate = function(user) {
			var res = authClient.login(user.email, user.password);
			res.then(function(res){
				
				// update storage
				$window.localStorage["auth"] = res.auth;
				$window.localStorage["session"] = res.session;

				var options = {
					'token' : res.sessionToken,
					'responseType' : 'id_token', 
					'scopes' : OKTACONFIG.id_scopes
				};

				// Get idToken and accessToken
				var tokens = authClient.getIdToken(options);
				tokens.then(function(idTokenResult) {
					tokenOptions = {
						url : OKTACONFIG.baseUrl,
						authUrl : OKTACONFIG.authUrl,
						responseType : 'token',
						id: OKTACONFIG.id,
						redirect : OKTACONFIG.redirect,
						scopes: OKTACONFIG.access_scopes
					}
					authClient.getAccessToken(tokenOptions).then(function(result){
						console.log("Retrieved both tokens\n", result, "\n", idTokenResult);
						$window.localStorage["tokens"] = angular.toJson({
							"idToken" : idTokenResult,
							"accessToken" : result
						});
						$location.url('/');
					}, function(error) { console.error(error); });
				}, function(err) { console.error(err); });		
			}, function(err) {console.error(err)});
		};
});




