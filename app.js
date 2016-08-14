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
		baseUrl: "https://example.oktapreview.com",
		id: "ViczvMucBWT14qg3lAM1",
		redirect: "http://localhost:8080/"
	});
	oktaAuth = authClient;
	clientScopes = [
		'openid',
		'email',
		'profile',
		'groups'
		];
});



var API_URL = "http://localhost:9000/protected"

var toJsonDate = function(item) {
	var itemDate = item.startTime.split('T')[0].split('-');
	var month = itemDate[1];
	var day = itemDate[2];
	var year = itemDate[0];
	return month+"/"+day+"/"+year
}

var getFirstAppointment = function(json) {
	return toJsonDate(json.data[0]);
}

app.controller("ScheduleController",
	function($scope, $window, $location, $timeout, $route, $anchorScroll, $http, authClient, apiClient) {
		var auth = $window.localStorage["auth"];
		var userInfo = $window.localStorage["userInfo"];
		var session = $window.localStorage["session"];


		apiClient.getAppointments()
		.then(function(appointments) {
			$window.localStorage["appointments"] = appointments;
		}, function (err) {
			console.error(err);
		});
		var appointmentData = $window.localStorage["appointments"];

		/* appointmentsSorted object:
			month : {
				startDate : appointments
			}
		*/

		var appointmentDays = function() {
			var appointmentsByDate = {}
			angular.forEach(JSON.parse(appointmentData).data, function(item) {
				var months = [
								"January", "February", "March",
								"April", "May", "June", "July", "August",
								"September", "October", "November", "December"
							];
				var jsonDate = toJsonDate(item);
				var date = item.startTime.split('T')[0].split('-');
				var month = jsonDate.split('/')[0];
				

				if(!appointmentsByDate[months[month-1]]){
					appointmentsByDate[months[month-1]] = {}
				}
				if(!appointmentsByDate[months[month-1]][jsonDate]){
					appointmentsByDate[months[month-1]][jsonDate] = []
				}
				appointmentsByDate[months[month-1]][jsonDate].push(item);
			});
			return appointmentsByDate;
		}

		// Update scope
		$scope.session = session;
		$scope.auth = !angular.isUndefined(auth) ? JSON.parse(auth) : undefined;
		$scope.appointmentData = !angular.isUndefined(appointmentData) ? JSON.parse(appointmentData) : undefined;
		$scope.userInfo = !angular.isUndefined(userInfo) ? JSON.parse(userInfo) : undefined;
		$scope.sorted = appointmentDays();

		var firstAppt = getFirstAppointment(JSON.parse(appointmentData));


		$scope.updateAppointmentList = function(date) {
			// Date format : MM/DD/YYYY
			var dailyAppointments = [];
			angular.forEach(JSON.parse(appointmentData).data, function(item) {
				var jsonDate = toJsonDate(item);

				if(jsonDate == date){
					dailyAppointments.push(item);
				}
			});
			$scope.appointments = dailyAppointments;
		}

		var setInitialApptView = $scope.updateAppointmentList(firstAppt);

		/**
		 *	Gets the Id and Access Token
		 */
		$scope.getTokens = function(auth) {
			var options = {
				'token' : auth.transaction.sessionToken,
				'responseType' : ['id_token', 'token'], // Requires list for multiple inputs
				'scopes' : clientScopes
			};
			oktaAuth.getTokens(options)
			.then(function(res){
				$window.localStorage["userInfo"] = angular.toJson(res);
				refresh(100);
				$location.hash("userInfoAnchor");
	  			$anchorScroll();
			}, function(err){
				console.error(err);
			});
		}

		/**
		 *	Calls external server to return Gavatar image url and name
		 */
		$scope.apiCall = function(token) {
			api_url = API_URL;
			$http({
				method : "GET",
				url : api_url,
				headers : {
					"Content-Type": undefined,
					Authorization : "Bearer " + token,
				} 
			}).then(function(res){
				if(res.data.Error){
					console.error(res.data.Error);
				} else {
					$window.localStorage["image"] = res.data.image;
					$window.localStorage["imageName"] = res.data.name;
					$scope.img = res.data.image;
					$scope.imgName = res.data.name;
					$location.hash("imgAnchor");
					$anchorScroll();
				}
			});
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
					console.log(res);
					clearStorage();
					$location.url("/login");
				}, function(err){
					console.log(err);
				});
			}, 100);
		}
});

app.controller("RequestsController",
	function($scope, $window, authClient, apiClient) {

		var appointmentData = JSON.parse($window.localStorage["appointments"]);
		var pending = [];
		angular.forEach(appointmentData.data, function(item){
			if(item.status != "CONFIRMED") {
				pending.push(item);
			}
		});
		$scope.requests = pending;

		$scope.cancelAppointment = function(appointment) {
			var cancel = apiClient.cancelAppointment(appointment);
			cancel.then(function(res) {
				var appointments = apiClient.getAppointments();
				appointments.then(function(appointments) {
					$window.localStorage["appointments"] = appointments;
					$window.location.reload();
				}, function (err) {
					console.error(err);
				});
			}, function(error) {
				console.error(error);
			});
		}

		$scope.confirmAppointment = function(appointment) {
			var confirm = apiClient.confirmAppointment(appointment);
			confirm.then(function(res) {
				console.log(res);
				var appointments = apiClient.getAppointments();
				appointments.then(function(appointments) {
					$window.localStorage["appointments"] = appointments;
					$window.location.reload();
				}, function (err) {
					console.error(err);
				});
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
	function($scope, $window, authClient, apiClient){

		$scope.login = function() {
				$scope.active = true;
		}

		$scope.authenticate = function(user) {
			var res = authClient.login(user.email, user.password);
			res.then(function(res){
				// update storage
				$window.localStorage["auth"] = res.auth;
				$window.localStorage["session"] = res.session;
				var authJSON = !angular.isUndefined(res.auth) ? JSON.parse(res.auth) : undefined;
				
				// call api
				var id = authJSON.transaction.user.id;
				
				var appointments = apiClient.getAppointments();
				appointments.then(function(appointments) {
					$window.localStorage["appointments"] = appointments;
					oktaClient.session.setCookieAndRedirect(res.sessionToken,
						oktaClient.options.redirectUri);
				}, function (err) {
					console.error(err);
				});

			}, function(err) {});
		};
});


