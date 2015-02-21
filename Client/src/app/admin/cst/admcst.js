angular.module('babar.admin.customer', [
    'babar.server',
    'ngMaterial'
])
    .controller('AdmCustomerCtrl', ['$rootScope', '$scope', '$state', '$stateParams', '$mdBottomSheet', 'Server', 'Decode', function($rootScope, $scope, $state, $stateParams, $mdBottomSheet, Server, Decode){

	$scope.debug = function() {
	    console.log($scope.admcst.state);
	};

	// FSM for the current customer
	var states = {
            CREATING: 'creating',
            READING: 'reading',
            UPDATING: 'updating'
        };
	this.state = {
	    current: $stateParams.id === "-1" ? states.CREATING : states.READING,
	    buttonChanged: function() {
		// the effect of the button depends on the current state
		switch(this.current){
		case 'creating':
		    // no effect
		    break;
		case 'reading':
		    // go to update mode
		    this.current = states.UPDATING;
		    this.button = true;
		    break;
		case 'updating':
		    // go back to read mode
		    this.current = states.READING;
		    this.button = false;
		    $scope.admcst.refresh();
		    break;
		}
	    },
	    button: $stateParams.id === "-1"
	};

	// the current customer
	this.current = {};

	// existing statuses in db
	this.statuses = [];
	Server.list.statuses()
	    .then(function(promised) {
		$scope.admcst.statuses = promised.data;
            });

	this.refresh = function() {
	    var id = $stateParams.id;
	    console.log(this.state, $stateParams.id);
	    if(this.state.current === 'reading') {
		Server.read.customer.info(id)
		    .then(function(promised) {
			// set general info
			$scope.admcst.current = Decode.customer(promised.data);
			// set status
			var status = $scope.admcst.statuses.filter(function(val, ind, arr) {
			    return val.id == $scope.admcst.current.statusId;
			});
			//initiate to the right status (that complicated 'cause ngOptions understand references instead of values)
			$scope.admcst.current.status = $scope.admcst.statuses[$scope.admcst.statuses.indexOf(status[0])];
			// get balance
			Server.read.customer.balance(id)
			    .then(function(promised){
				$scope.admcst.current.money = parseFloat(promised.data.balance);
			    });
		    });
	    }
	};
	// register this standard refresh function
        $rootScope.$on('refresh', function(e, a) {$scope.admcst.refresh();});

	// show a bottom sheet
	this.botsheet = function($event) {
	    $mdBottomSheet.show({
		templateUrl: 'admcst-botsheet.tpl.html',
		controller: 'AdmCustomerBotSheetCtrl',
		controllerAs: 'admcstbs',
		targetEvent: $event
	    }).then(function(promised) {
		new Toast().display(promised.data);
	    });
	};
	/*
	  this.del = function(){
	  //delete current user (to be confirmed by a password)
	  var func = 'del';
          var args = {
          object: 'customer',
	  id: $scope.admcst.current.id
          };
	  var promise = Server.del(args.object, args.id);
          React.toPromise(promise, func, args, function() {
	  //refresh customers' list
          $state.go('admin');
	  $scope.admin.getAdminItems('customer');
          });
	  };
	  
	  this.confirm = function(){
	  // Before all, update current.statusId according to the current status
	  this.updateStatusId();
	  // Confirm only if the form is untouched or touched but valid
	  if($scope.cstForm.$valid){
	  var func, args, promise;
	  if($stateParams.id == -1) { // The confirmation concerns an adding
	  //add blank fields
	  $scope.admcst.current.id = -1;
          $scope.admcst.current.password = 'none';
	  // react procedure
	  func = 'add';
          args = {
	  object: 'customer',
	  data: this.current
          };
	  promise = Server.add(args.object, args.data);
          React.toPromise(promise, func, args, function() {
          $scope.admcst.isReadOnly = true;
          $scope.admcst.isWrite = false;
	  $scope.admin.getAdminItems('customer');
          });
	  }
	  else { // The confirmation concerns an update
	  func = 'update';
          args = {
          object: 'customer',
          data: this.current,
	  id: this.current.id
          };
	  promise = Server.update(args.object, args.data, args.id);
          React.toPromise(promise, func, args, function() {
          $scope.admcst.isReadOnly = true;
	  $scope.admcst.isWrite = false;
          $scope.admin.getAdminItems('customer');
          });
	  }
	  }
          };

	  this.cancel = function(){
	  this.isReadOnly = true;
	  this.isWrite = false;
	  $scope.admin.getAdminItems('customer');
          if($stateParams.id === -1) {
	  $scope.$parent.admin.currentItem = null;
	  $state.go('admin');
          }
	  };
	*/
	
	// bring it on
	this.refresh();
    }])
    .controller('AdmCustomerBotSheetCtrl', function($mdBottomSheet) {
	this.opts = [
	    {
		label: 'Delete',
		icon: 'close',
		action: $scope.admcstbs.del
	    }
	];

	this.del = function() {

	};
	
    });
