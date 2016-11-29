angular
.module("ApiClient", ["OktaConfig"])
.factory("apiClient", function($q, $http, $timeout, OKTACONFIG) {

	// Endpoint for resource server
	// var BASE_URL = "http://localhost:8088";

	// AWS Lambda Endpoint
	var BASE_URL = OKTACONFIG.apiUrl;
	
	var apiClient = {};

	apiClient.getAppointments = function(token, filter) {
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/"+filter;
		$http({
			method : "GET",
			url : api_url,
			headers : {
				"Content-Type": "application/json",
				Authorization : "Bearer " + token
			} 
		})
		.then(function(res){
			if(res.data.Error){
				deferred.reject(res.data.Error);
			}
			else {
				deferred.resolve(angular.toJson(res.data.message));
			}	
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	};

	apiClient.confirmAppointment = function(appointment, token) {
		appointment["status"] = "CONFIRMED"
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/" + appointment["id"];
		$http({
			method: "PUT",
			url : api_url,
			data : appointment,
			headers : {
				"Content-Type" : "application/json",
				Authorization : "Bearer " + token
			}
		})
		.then(function(res) {
			if(res.data.Error) {
				deferred.reject(res.data.Error);
			} else { deferred.resolve(angular.toJson(res));}
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	apiClient.cancelAppointment = function(appointment, token) {
		appointment["status"] = "DENIED"
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/" + appointment["id"];
		$http({
			method: "PUT",
			url : api_url,
			data : appointment,
			headers : {
				"Content-Type" : "application/json",
				Authorization : "Bearer " + token
			}
		})
		.then(function(res) {
			if(res.data.Error) {
				deferred.reject(res.data.Error);
			} else { deferred.resolve(angular.toJson(res));}
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	apiClient.deleteAppointment = function(appointment, token) {
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/" +appointment["id"];
		$http({
			method: "DELETE",
			url : api_url,
			data : appointment,
			headers : {
				"Content-Type" : "application/json",
				Authorization : "Bearer " + token
			}
		})
		.then(function(res) {
			if (res.data.Error) {
				deferred.reject(res.data.Error);
			} else { deferred.resolve(res)}
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	apiClient.populate = function(data) {
		var deferred = $q.defer();
		api_url = BASE_URL + "/populate";
		$http({
			method: "POST",
			url : api_url,
			headers : {"Content-Type" : "application/json"},
			data: data
		})
		.then(function(res) {
			if(res.data.Error) { deferred.reject(res.data.Error);}
			else{ deferred.resolve(res); }
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	return apiClient;
});