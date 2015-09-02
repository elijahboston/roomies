var app = angular.module('roomiesApp', []);

function getRoomieByName(db, name) {
	// Return roommate by name
	var result = db.select('/*/[/name == "'+name+'"]');
	return result.length == 1 ? result[0].value : undefined;
}

function getExpensesByName(db, name) {
	// Return expenses across all roomates by name
	result = db.select('/*/expenses/*[/name == "'+name+'"]');
	return result.length > 0 ? result : [];
}

function init(house) {
	// Try to initialize with local data
	var localRoomies = localStorage.getItem('rmsRoomies'),
		localExpenses = localStorage.getItem('rmsExpenses');

	house.sections = {};

	if (localRoomies && localExpenses) {
		house.roomies = JSON.parse(localRoomies);
		house.expenses = JSON.parse(localExpenses);
	} else {
		house.roomies = [];
		house.expenses = [];
	}
}


app.controller('HouseController', function() {
	var house = this;
	init(house);

	house.save = function() {
		localStorage.setItem('rmsRoomies', JSON.stringify(this.roomies));
		localStorage.setItem('rmsExpenses', JSON.stringify(this.expenses));
	};

	house.hasRoomies = function() {
		if (house.roomies.length > 0) { return true; }
		return false;
	};

	house.hasExpenses = function() {
		return house.expenses.length > 0;
	};

	house.hasRoomiesNoExpenses = function() {
		return house.hasRoomies() && !house.hasExpenses();
	};

	house.addRoomie = function() {
		house.roomies.push({id: house.roomies.length, name: house.roomieName, owes: 0.00, expenses: []});
		house.roomieName = '';
	};

	house.deleteRoomie = function(deletedRoomie) {
		// Un-split Expenses
		var db = SpahQL.db(house.roomies);

		// Select based on name
		var deletedRoomieResult = getRoomieByName(db, deletedRoomie.name);

		angular.forEach(deletedRoomie.expenses, function(expense) {
			// Get roomies with matching expenses based on id
			var matchingExpenses = getExpensesByName(db, expense.name);

			// If this is the only user with this expense, then it goes away
			// otherwise we split it evenly with the remaining roommates
			var newSplit = matchingExpenses.length-1 > 0 ? 100/(matchingExpenses.length-1) : 0;

			// If we are splitting it, apply to the other roommates
			if (newSplit > 0) {
				angular.forEach(matchingExpenses, function(expenseResult) {
					if (deletedRoomie.name != expenseResult.value.roomieName) {
						expenseResult.value.split = newSplit;
						expenseResult.value.indivCost = expenseResult.value.totalCost*(100/newSplit);
					}
				});
			}
		});
		// Finally, delete this user and their expenses
		house.roomies.splice(deletedRoomieResult.id, 1);
		house.recalc();
	};

	house.addExpense = function() {
		var id = house.expenses.length;
		house.expenses.push({id: id, name: house.expenseName, totalCost: parseFloat(house.expenseTotalCost) });

		angular.forEach(house.roomies, function(roomie) {
			var split = 100/house.roomies.length;
			var indivCost = house.expenseTotalCost / house.roomies.length;

			roomie.expenses.push({id: id, roomieName: roomie.name, name: house.expenseName, totalCost: parseFloat(house.expenseTotalCost), indivCost: indivCost, split: split});
			roomie.owes += indivCost;
		});

		house.expenseName = '';
		house.expenseTotalCost = '';
		house.recalc();
	};

	house.deleteExpense = function(deletedExpense) {
		// Remove an expense from the entire household
		house.expenses.splice(deletedExpense.id, 1);
		angular.forEach(house.roomies, function(roomie) {
			for(x=0; x < roomie.expenses.length; x++) {
				if (roomie.expenses[x].id == deletedExpense.id) {
					roomie.expenses.splice(x,1);
				}
			}
		});
		house.recalc();
	};

	house.deleteIndividualExpense = function(selectedRoomie, deletedExpense) {
		// Remove an expense from a single roomie, split it among those who still share the expense
		// or remove it entirely
		selectedRoomie.expenses.splice(deletedExpense.id, 1);
		var db = SpahQL.db(house.roomies);
		var sharedExpenses = getExpensesByName(db, deletedExpense.name);

		if (sharedExpenses.length > 0) {
			var newSplit = 100/sharedExpenses.length;
			angular.forEach(sharedExpenses, function(expense) {
				if (expense.roomieName != selectedRoomie.name) {
					var roomie = getRoomieByName(db, expense.value.roomieName);
					angular.forEach(roomie.expenses, function(roomieExpense) {
						if (roomieExpense.name == deletedExpense.name) {
							roomieExpense.split = newSplit;
							roomieExpense.indivCost = (newSplit/100)*roomieExpense.totalCost;
						}
					});


				}
			});
		} else {
			angular.forEach(house.expenses, function(expense) {
				if (expense.name == deletedExpense.name) {
					house.expenses.splice(expense.id, 1);
				}
			});
		}
		house.recalc();
	};

	house.changeExpenseSplit = function(changedRoomie, changedExpense) {
		var sharingExpense = 0;
		angular.forEach(house.roomies, function(roomie) {
			angular.forEach(roomie.expenses, function(expense) {
				if (changedExpense.name == expense.name) {
					sharingExpense++;
				}
			});
		});
		// Add check to make sure the new split is less than 100%
		angular.forEach(house.roomies, function(roomie) {
			var splitRemainder = (100-changedExpense.split)/(sharingExpense-1);

			for(x=0; x < roomie.expenses.length; x++) {
				// Calculate new %'s for this expense and the expense belonging to other roommates
				if (changedRoomie.name == roomie.name && changedExpense.name == roomie.expenses[x].name) {
					roomie.expenses[x].split = changedExpense.split;
					roomie.expenses[x].indivCost = (changedExpense.split/100)*roomie.expenses[x].totalCost;
				} else if (changedExpense.name == roomie.expenses[x].name) {
					roomie.expenses[x].split = splitRemainder;
					roomie.expenses[x].indivCost = (splitRemainder/100)*roomie.expenses[x].totalCost;
				}
			}
		});

		house.recalc();
	};

	house.recalc = function() {
		angular.forEach(house.roomies, function(roomie) {
			var owes = 0.00;
			angular.forEach(roomie.expenses, function(expense) {
				owes += expense.indivCost;
			});
			roomie.owes = owes;
		});
		house.save();
	};

	house.totalExpenses = function() {
		var total = 0.00;
		angular.forEach(house.expenses, function(expense) {
			total += parseFloat(expense.totalCost);
		});
		return total;
	};

	house.reset = function() {
		localStorage.clear();
		init(house);
	};

	house.setSection = function(section) {
		if (!house.sections[section]) {
			house.sections[section] = true;
 		} else {
			house.sections[section] = false;
		}
	};

	house.sectionSelected = function(section) {
		return house.sections[section];
	};
});
