angular.module('babar.sell', [
    'babar.sell.cst',
    'babar.sell.drk',
    'babar.sell.prf',
    'babar.conf',
    'babar.server',
    'babar.utils',
    'babar.error',
    'babar.deposit',
    'babar.easter',
    'ngDialog',
    'ngMaterial',
    'cfp.hotkeys',
    'ui.router'
])
    .factory('Focus', [function(){
	//This aim to make the navigation easier by setting up keyboard shortcuts
	//There are three fields of interest: customer input, drink input, sell confirmation, and neither of these
	Focus = function(){

	    //keeps tracks on focus's location
	    var location = {
		out: 0, //focus is lost
		customer: 1,
		drink: 2,
		confirmation: 3,
		current: 0 //where we are now
	    };

	    this.getLocation = function(){
		switch(location.current){
		case 1:
		    return 'customer';
		case 2:
		    return 'drink';
		case 3:
		    return 'confirmation';
		default:
		    return 'null';
		}
	    };

	    this.setLocation = function(newLocation){
		location.current = location[newLocation];
		if(newLocation === 'customer'){
                    document.getElementById('customerInput').focus();
                }else if(newLocation === 'drink'){
		    document.getElementById('drinkInput').focus();
                } 
                return newLocation === 'confirmation'; //isWaitingForConfirm
	    };
	    
	    this.forward = function(){
		var isWaitingForConfirm;
		switch(location.current){
		case 1:
		    document.getElementById('drinkInput').focus();
                    location.current = location.drink;
		    isWaitingForConfirm = false;
		    break;
		case 2:
                    document.getElementById('drinkInput').blur();
                    location.current = location.confirmation;
		    isWaitingForConfirm = true;
		    break;
		case 3:
                    document.getElementById('drinkInput').focus();
                    location.current = location.drink;
                    isWaitingForConfirm = false;
                    break;
	        default :
		    document.getElementById('customerInput').focus();
                    location.current = location.customer;
                    isWaitingForConfirm = false;
                    break;
		}
		return isWaitingForConfirm;
	    };

	    this.backward = function(){
		var isWaitingForConfirm = false;
                switch(location.current){
                case 2:
                    document.getElementById('customerInput').focus();
                    location.current = location.customer;
                    break;
                case 3:
                    document.getElementById('drinkInput').focus();
                    location.current = location.drink;
                    break;
                default :
		    document.getElementById('customerInput').focus();
                    location.current = location.customer;
                    break;
                }
                return isWaitingForConfirm;
            };

	    this.lose = function(){
		var location = this.getLocation();
		if(location === 'customer' || location === 'drink'){
		    document.getElementById(location+'Input').blur();
		}
	    };
            
        };

        return new Focus();
    }])

    
    .controller('SellCtrl', ['$rootScope', '$scope', '$state', '$mdDialog', 'Server', 'Decode', 'Focus', 'Konami', 'Toast', 'searchFilter', 'selectFilter', 'hotkeys', 'ngDialog', function($rootScope, $scope, $state, $mdDialog, Server, Decode, Focus, Konami, Toast,searchFilter, selectFilter, Hotkeys, ngDialog){

	this.debug = function(arg){
	    new Toast().display($scope);
	};

	// if someone attempts to reload the page, logout the current user
	Server.logout();
	
	// a refresh method
	var refresh = function(){
            //Gotta reload Hotkeys' binding
            $scope.sell.loadHotkeys();
	    //Set the focus back
	    Focus.setLocation('drink');
        };
	$scope.$on('refresh', function(e, a) {refresh();});

        this.confirm = function() {
	    $mdDialog.show({
                templateUrl: 'conf/conf.tpl.html',
                controller: 'ConfCtrl',
                controllerAs: 'conf',
                locals: {
                    customer: $scope.sellcst.current,
                    drink: $scope.selldrk.current
                }
            });
	};
 
        // takes the money value and returns an appropriate color
        this.getMoneyColor = function(){
            if (!$scope.sellcst || $scope.sellcst.current.details === null){
		return '#EE999C'; //pink
	    }else{
		var money = $scope.sellcst.current.getActualMoney();
		//resolve appropriate color
		if(money > 15){
		    return '#15BF25'; //green
		}
		else if(money > 10){
		    return '#FFA005'; //yellow
		}
		else if(money > 5){
		    return '#FF5900'; //orange
		}
		else{
		    return '#E5251E'; //red
		}
	    }
	};

	// convert a date to something readable
	this.toDateString = function(date){
	    var dateObj = new Date(parseInt(date, 10));
	    return dateObj.toDateString();
	};

	// For we need to know where the focus is when using the mouse
	this.tellInputFocus = function(whichInput){
	    Focus.setLocation(whichInput);
	};

        // For we must be able to enter confirmation mode when using the mouse
        this.mouseAttempt = function(){
            if($scope.sellcst.current.details !== null && $scope.selldrk.current.details !== null){
                this.confirm();
            }
        };

	// when one needs to add some money
        this.deposit = function() {
            $mdDialog.show({
                templateUrl: 'deposit/deposit.tpl.html',
                controller: 'DepositCtrl',
                controllerAs: 'dep',
                locals: {
                    customer: $scope.sellcst.current,
		    user: $scope.sell.authUser
                }
            });
        };
	
	this.makeDeposit = function(){
	    Focus.lose();
	    this.disableHotkeys();
            var dialog = ngDialog.open({
                template: 'deposit/deposit.tpl.html',
                controller: 'DepositCtrl as deposit',
                data: [$scope.sellcst.current.details],
                className: 'ngdialog-theme-plain',
                showClose: false,
                closeByEscape: false,
                closeByDocument: false
            });
            dialog.closePromise.then(function(promised){
		new Toast().display(promised.value);
		$rootScope.$emit('refresh', {'from':'deposit', 'to':'all'});
	    });
	};

	
	//When an user is authenticated through time, we gotta display it
	this.authUser = null;
	this.authRemTime = 0;
	$rootScope.$on('login', function(e, a){
	    console.log(e, a);
	    $scope.sell.authUser = a.user;
	    var time = (new Date()).getTime();
	    var remain = a.endTime-time>0?a.endTime-time:0;
	    $scope.sell.authRemTime = Math.floor(remain/(1000*60));
	    var updateCountdown = function(){
		window.setTimeout(function(){
		    $scope.sell.authRemTime--;
		    if($scope.sell.authRemTime<0){
			$scope.sell.authUser = null;
			$scope.sell.authRemTime = 0;
		    }else{
			updateCountdown();
		    }
		    $scope.$apply();
                }, 60*1000);
	    };
	    updateCountdown();
	});
	
    }]);
