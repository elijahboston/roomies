var app = angular.module('roomiesApp', []);

app.controller('HouseController', function() {
	var house = this;
	house.roomies = [
		{id:0, name: 'Elijah', owes: 0.00, expenses: []},
		{id:1, name: 'James', owes: 0.00, expenses: []}
	];

	house.expenses = [];

	house.addRoomie = function() {
		house.roomies.push({id: house.roomies.length, name: house.roomieName, owes: 0.00, expenses: []});
		house.roomieName = '';
	};

	house.addExpense = function() {
		var id = house.expenses.length;
		house.expenses.push({id: id, name: house.expenseName, totalCost: house.expenseTotalCost});

		angular.forEach(house.roomies, function(roomie) {
			var split = 100/house.roomies.length;
			var indivCost = house.expenseTotalCost / house.roomies.length;

			roomie.expenses.push({expense_id: id, name: house.expenseName, totalCost: house.expenseTotalCost, indivCost: indivCost, split: split});
			roomie.owes += indivCost;
		});

		house.expenseName = '';
		house.expenseTotalCost = '';
	};

	house.deleteExpense = function(deletedExpense) {
		house.expenses.splice(deletedExpense.id, 1);
		angular.forEach(house.roomies, function(roomie) {
			for(x=0; x < roomie.expenses.length; x++) {
				if (roomie.expenses[x].expense_id == deletedExpense.id) {
					roomie.owes -= roomie.expenses[x].indivCost;
					roomie.expenses.splice(x,1);
				}
			}
		});
	};

	house.changeExpenseSplit = function(changedRoomie, changedExpense) {
		// Add check to make sure the new split is less than 100%
		angular.forEach(house.roomies, function(roomie) {
			var splitRemainder = (100-changedExpense.split)/(house.roomies.length-1);

			for(x=0; x < roomie.expenses.length; x++) {
				// Calculate new %'s for this expense and the expense belonging to other roommates
				if (changedRoomie.id == roomie.id) {
					roomie.expenses[x].split = changedExpense.split;
					roomie.expenses[x].indivCost = (changedExpense.split/100)*roomie.expenses[x].totalCost;
					house.recalc();
				} else {
					roomie.expenses[x].split = splitRemainder;
					roomie.expenses[x].indivCost = (splitRemainder/100)*roomie.expenses[x].totalCost;
					house.recalc();
				}
			}
		});
	}

	house.recalc = function() {
		angular.forEach(house.roomies, function(roomie) {
			var owes = 0.00;
			angular.forEach(roomie.expenses, function(expense) {
				owes += expense.indivCost;
			});
			roomie.owes = owes;
		});
	}
});