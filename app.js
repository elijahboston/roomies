var app = angular.module('roomiesApp', []);

app.controller('HouseController', function() {
	var house = this;
	house.roomies = [
		{name: 'John', owes: 0.00, expenses: []},
		{name: 'Bob', owes: 0.00, expenses: []}
	];

	house.expenses = [];

	house.addRoomie = function() {
		house.roomies.push({name: house.roomieName, owes: 0.00, expenses: []});
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
});