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

var app = angular.module("app", ["ngRoute", "OktaAuthClient", "ApiClient"]);
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

app.run(function(authClient){
	oktaClient = authClient.create({
		baseUrl: "https://jordandemo.oktapreview.com",
		id: "Jw1nyzbsNihSuOETY3R1",
		redirect: "http://localhost:8080"
	});
	oktaAuth = authClient;
	clientScopes = [
		'openid',
		'email',
		'profile',
		'groups',
		'appointments:read',
		'providers:read',
		'appointments:write'
		];
});

var toJsonDate = function(item) {
	var itemDate = item.startTime.split('T')[0].split('-');
	var month = itemDate[1];
	var day = itemDate[2];
	var year = itemDate[0];
	return month+"/"+day+"/"+year
}

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

var filterAppointments = function(appointmentData, date) {
	// Date format : MM/DD/YYYY
	var dailyAppointments = [];
	angular.forEach(JSON.parse(appointmentData), function(item) {
		if(item.startTime == date){	dailyAppointments.push(item);	}
	});
	return dailyAppointments;
}

app.controller("ScheduleController",
	function($scope, $window, $location, $timeout, $route, $anchorScroll, $http, authClient, apiClient) {
		var auth = $window.localStorage["auth"];
		var session = $window.localStorage["session"];
		console.log(auth, session);
		if(angular.isUndefined(auth) || angular.isUndefined(session)){
			$location.url("/login");
		}
		var tokens = !angular.isUndefined($window.localStorage["tokens"]) ? JSON.parse($window.localStorage["tokens"]) : undefined;
		var id = tokens.idToken.claims.sub;
		var accessToken = tokens.accessToken.accessToken;		

		apiClient.getAppointments(accessToken)
		.then(function(appointments) {
			var appointmentJSON = JSON.parse(appointments).data;
			var confirmedAppointments = [];
			angular.forEach(appointmentJSON, function(item){
				if(item.providerId == id && item.status == "CONFIRMED") {
					confirmedAppointments.push(item);
				}
			});
			$window.localStorage["appointments"] = angular.toJson(appointments);
			$window.localStorage["confirmedAppointments"] = angular.toJson(confirmedAppointments);
		}, function (err) {
			console.error(err);
		});

		var confirmedAppointments = $window.localStorage["confirmedAppointments"];
		var appointmentData = $window.localStorage["appointments"];

		// Vars to init
		var appointments = undefined;
		var sorted = undefined;
		if(!angular.isUndefined(confirmedAppointments) && JSON.parse(confirmedAppointments).length > 0){
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
				
				if(!appointmentsByDate[months[month-1]]){appointmentsByDate[months[month-1]] = {}}
				if(!appointmentsByDate[months[month-1]][item.startTime]){appointmentsByDate[months[month-1]][item.startTime] = []}
				appointmentsByDate[months[month-1]][item.startTime].push(item);

			});

			var firstAppt = getFirstAppointment(appointmentsByDate);
			var setInitialApptView = filterAppointments(confirmedAppointments, firstAppt.startTime);
			appointments = setInitialApptView;
			sorted = appointmentsByDate;		
		} else {
			appointments = confirmedAppointments;
			sorted = confirmedAppointments;
		}

		// Update scope
		$scope.auth = !angular.isUndefined(auth) ? JSON.parse(auth) : undefined;
		$scope.session = session;
		$scope.tokens = tokens;
		if(angular.isUndefined(appointments) || angular.isUndefined(sorted)){
			refresh(100);
		}
		$scope.appointments = appointments;
		$scope.sorted = sorted;

		$scope.updateAppointmentList = function(date) {
			$scope.appointments = filterAppointments(confirmedAppointments, date);
		}

	  	/**
		 *	Refreshes the current page given time duration until refresh
	  	 */
		function refresh(duration){
			setTimeout(function() {$route.reload();}, duration);
		}

		/**
		 *	Clears the localStorage saved in the web browser and scope variables
		 */
		function clearStorage(){
			$window.localStorage.clear();
			$scope = $scope.$new(true);
		}

		/**
		 *	Signout method called via button selection
		 */
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

app.controller("RequestsController",
	function($scope, $window, $route, authClient, apiClient) {
		var auth = $window.localStorage["auth"];
		var session = $window.localStorage["session"];
		var appointmentData = JSON.parse($window.localStorage["appointments"]);
		var pending = [];
		var tokens = !angular.isUndefined($window.localStorage["tokens"]) ? JSON.parse($window.localStorage["tokens"]) : undefined;
		var id = tokens.idToken.claims.sub;
		var accessToken = tokens.accessToken.accessToken;

		angular.forEach(appointmentData.data, function(item){
			if(item.status == "REQUESTED" && item.providerId == id) {
				pending.push(item);
			}
		});

		// Update scope
		$scope.requests = pending;
		$scope.tokens = tokens;
		$scope.auth = !angular.isUndefined(auth) ? JSON.parse(auth) : undefined;
		$scope.session = session;

		$scope.cancelAppointment = function(appointment) {
			var cancel = apiClient.cancelAppointment(appointment, accessToken);
			cancel.then(function(res) {
				$route.reload();
			}, function(error) {
				console.error(error);
			});
		}

		$scope.confirmAppointment = function(appointment) {
			var confirm = apiClient.confirmAppointment(appointment, accessToken);
			confirm.then(function(res) {
				$route.reload();
			}, function(error) {
				console.error(error);
			});
		}
});

/**
 *	Authenticates the user with custom login UI using AuthSDK
 *
 * 	Stores the response object in localStorage and sets the current session to true
 */
app.controller("LoginController",
	function($scope, $window, $timeout, authClient, apiClient){
		$scope.authenticate = function(user) {

			var res = authClient.login(user.email, user.password);
			res.then(function(res){
				
				// update storage
				$window.localStorage["auth"] = res.auth;
				$window.localStorage["session"] = res.session;
				console.log('authenticated');

				var options = {
					'token' : res.sessionToken,
					'responseType' : ['id_token', 'token'], // Requires list for multiple inputs
					'scopes' : clientScopes
				};

				var tokens = authClient.getTokens(options);
				tokens.then(function(result) {
					var renewIdToken = authClient.renewIdToken(clientScopes);
					renewIdToken.then(function(newToken) {
						$window.localStorage["tokens"] = angular.toJson({
						"idToken" : newToken["idToken"],
						"accessToken" : result["accessToken"]
						});
						}, function(err) { console.error(err); }
					);
					$timeout(function(){
						// Populate appointments
						oktaClient.session.setCookieAndRedirect(res.sessionToken,
								oktaClient.options.redirectUri+"/#");
					}, 1000);
					
				}, function(error) {console.log(error)});

			}, function(err) {console.error(err)});

			
			
		};
});


