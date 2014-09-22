angular.module('babar.sell', [
    'babar.server',
    'babar.confirm',
    'ngDialog',
    'cfp.hotkeys'
])
    .filter('search', function(){
	return function(input, keyword){
	    return input.filter(function(val, ind, arr){
		// test if keyword is included in the name or surname
		return val.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1;
	    });
	};
    })

    .filter('select', function(){
	return function(input, index){
	    return input.map(function(val, ind, arr){
		if(ind === index){
		    val.active = true;
		}else{
		    val.active = false;
		}
		return val;
	    });
	};
    })

    .filter('chronological', function(){
	return function(input){
	    //sort items chronogically
	    if(input){
		return input.sort(function(a, b){
		    var dateA = new Date(a.time);
		    var dateB = new Date(b.time);
		    return dateB.getTime() - dateA.getTime();
		});
	    }
	};
	
    })

    .factory('Focus', [function(){
	//This aim to make the navigation easier by setting up keyborad shortcuts
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
	    
	};

	return new Focus();
    }])

    .controller('SellCtrl', ['$scope', 'Server', 'Focus', 'chronologicalFilter', 'searchFilter', 'selectFilter', 'hotkeys', 'ngDialog', function($scope, Server, Focus, chronologicalFilter, searchFilter, selectFilter, Hotkeys, ngDialog){

	this.debug = function(arg){
	    console.log(Hotkeys.get('enter'));
	    // this.loadHotkeys();
	};
	
	//load customers' list
	this.customers = [];
	Server.getCustomers()
	    .then(function(customers){
		$scope.sell.customers = customers;
	    });
	
        //load drinks' list
	this.drinks = [];
        Server.getDrinks()
            .then(function(drinks){
                $scope.sell.drinks = drinks;
            });
	
	// current customer
	this.customer = {
	    keyword: "",
	    index: 0,
	    size: 0,
	    details: null,
	    totalSpent: function(){
		//TODO : put total money spent in details
		return '42';
	    },
	    favDrink: function(){
		//TODO : check if ain't faster to handle this server-side
		if(this.details !== null){
                    var favourite;
		    var times = {};
                    chronologicalFilter(this.details.history).forEach(function(val, ind, arr){
			if(!times[val.name]){
			    times[val.name] = 1;
			}else{
			    times[val.name] += 1;
			}
		    });
		    var howMany = 0;
		    for(var drink in times){
			if(times[drink] > howMany){
			    favourite = drink;
			    howMany = times[drink];
			}
		    }
		    if(howMany !== 0){
			return favourite;
		    }else{
			return 'none';
		    }
		}else{
		    return null;
		}
	    },
	    refresh: function(){
		Server.getCustomerInfo(
		    selectFilter(
			searchFilter(
			    $scope.sell.customers,
			    this.keyword),
			this.index)
		    [this.index].id)
		    .then(function(details){
			$scope.sell.customer.details = details;
		    });
		this.size = selectFilter(
                    searchFilter(
                        $scope.sell.customers,
                        this.keyword),
                    this.index).length; 
            },
	    up: function(){
		if(this.index > 0){
		    this.index -= 1;
		    this.refresh();
		}
	    },
	    down: function(){
		if(this.index < this.size - 1){
		    this.index +=1;
		    this.refresh();
		}
	    },
	    setIndex: function(index, isAMouseAttempt){
		this.index = index;
		if(isAMouseAttempt){
		    Focus.setLocation('customer');
		    this.refresh();
		}
            },
	    blockIndex: function(){
		$scope.sell.customer.setIndex(0, false);
	    }
	};

	//current drink
	this.drink = {
            keyword: "",
	    index: 0,
	    size: 0,
	    details: null,
	    isToConfirm: false,
	    refresh: function(){
                this.details = selectFilter(
                    searchFilter(
                        $scope.sell.drinks,
                        this.keyword),
                    this.index)
                [this.index];
		this.size = selectFilter(
                    searchFilter(
                        $scope.sell.drinks,
                        this.keyword),
                    this.index).length;
            },
            up: function(){
		if(this.index > 0){
                    this.index -= 1;
		    this.refresh();
		}
            },
            down: function(){
		if(this.index < this.size - 1){
                    this.index +=1;
		    this.refresh();
		}
            },
            setIndex: function(index, isAMouseAttempt){
                this.index = index;
		if(isAMouseAttempt){
		    Focus.setLocation('drink');
		    $scope.sell.mouseAttempt();
		    this.refresh();
		}
	    },
            blockIndex: function(){
                $scope.sell.drink.setIndex(0, false);
            },
	    buy: function(customer){
		//DIALOG
		this.details = null;
	    },
	    cancel: function(){
		this.details = null;
	    }
        };

        //setting up watches so the highlighted item will always be zero during a search
        $scope.$watch(this.customer.keyword, this.customer.blockIndex);
        $scope.$watch(this.drink.keyword, this.drink.blockIndex);

	this.confirm = function(){
            var dialog = ngDialog.open({
                template: 'confirm/confirm.tpl.html',
                controller: 'ConfirmCtrl as confirm',
                data: [$scope.sell.customer.details, $scope.sell.drink.details],
                className: 'ngdialog-theme-plain',
                showClose: false,
                closeByEscape: false,
                closeByDocument: false
            });
            dialog.closePromise.then(function(value){
		$scope.sell.customer.refresh();
		$scope.sell.drink.refresh();
		//Gotta reload Hotkeys' binding
		$scope.sell.loadHotkeys();
		Focus.setLocation('drink');
            });
        };
	
        // takes the money value and returns an appropriate color
	this.getMoneyColor = function(){
	    if (this.customer.details === null){
		return '#EE999C'; //pink
	    }
	    else if(this.customer.details.money > 15){
		return '#15BF25'; //green
	    }
	    else if(this.customer.details.money > 10){
		return '#FFA005'; //yellow
	    }
	    else if(this.customer.details.money > 5){
		return '#FF5900'; //orange
            }
	    else {
		return '#E5251E'; //red
	    }
	};

	// convert a date to something readable
	this.toDateString = function(date){
	    var dateObj = new Date(date);
	    return dateObj.toDateString();
	};

	//For we need to know where the focus is when using the mouse
	this.tellInputFocus = function(whichInput){
	    Focus.setLocation(whichInput);
	};

        //For we must be able to enter confirmation mode when using the mouse
        this.mouseAttempt = function(){
            if(this.customer.details !== null && this.drink.details !== null){
                this.confirm();
            }
        };
	
        //This sets up some hotkeys
	var hotkConfirm = function(){
            if(Focus.forward()){ //isWaitingForConfirm
                $scope.sell.confirm();
	    }else{
		$scope.sell.customer.refresh();
		$scope.sell.drink.refresh();
	    }
        };
        var hotkCancel= function(){
	    Focus.backward();
            $scope.sell.customer.refresh();
            $scope.sell.drink.refresh();
        };
	var hotkUp = function(){
	    if(Focus.getLocation() === 'customer'){
                $scope.sell.customer.up();
	    }else if(Focus.getLocation() === 'drink'){
		$scope.sell.drink.up();
	    }
	};
	
	var hotkDown = function(){
	    if(Focus.getLocation() === 'customer'){
                $scope.sell.customer.down();
            }else if(Focus.getLocation() === 'drink'){
                $scope.sell.drink.down();
            }  
	};

	this.loadHotkeys = function(){
            Hotkeys.add({
                combo: 'enter',
                description: 'Move to the next field',
                callback: hotkConfirm,
                allowIn: ['INPUT']
	    });
	    Hotkeys.add({
                combo: 'escape',
                description: 'Move to the previous field',
                callback: hotkCancel,
                allowIn: ['INPUT']
	    });
	    Hotkeys.add({
                combo: 'up',
                description: 'Move upward the selected field',
                callback: hotkUp,
                allowIn: ['INPUT']
	    });
	    Hotkeys.add({
                combo: 'down',
                description: 'Move downward the selected field',
                callback: hotkDown,
                allowIn: ['INPUT']
	    });
	};
	this.loadHotkeys();
	
    }]);
