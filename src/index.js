"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimAndTransform = exports.capitalizeFirst = void 0;
exports.createUser = createUser;
exports.createBook = createBook;
exports.calculateArea = calculateArea;
exports.getStatusColor = getStatusColor;
exports.getFirstElement = getFirstElement;
exports.findById = findById;
function createUser(id, name, email, isActive) {
    if (isActive === void 0) { isActive = true; }
    return {
        id: id,
        name: name,
        email: email,
        isActive: isActive
    };
}
var user1 = createUser(1, "Иван Петров");
var user2 = createUser(2, "Мария Сидорова", "maria@mail.com", false);
console.log(user1, user2);
function createBook(book) {
    return book;
}
var book1 = createBook({
    title: "Война и мир",
    author: "Лев Толстой",
    year: 1869,
    genre: 'fiction'
});
var book2 = createBook({
    title: "Краткая история времени",
    author: "Стивен Хокинг",
    genre: 'non-fiction'
});
console.log(book1, book2);
function calculateArea(shape, param) {
    if (shape === 'circle') {
        return Math.PI * param * param;
    }
    else {
        return param * param;
    }
}
console.log(calculateArea('circle', 2));
console.log(calculateArea('square', 4));
function getStatusColor(status) {
    switch (status) {
        case 'active':
            return 'green';
        case 'inactive':
            return 'red';
        case 'new':
            return 'blue';
    }
}
console.log(getStatusColor('active'));
console.log(getStatusColor('inactive'));
console.log(getStatusColor('new'));
var capitalizeFirst = function (str, uppercase) {
    if (uppercase === void 0) { uppercase = false; }
    if (str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};
exports.capitalizeFirst = capitalizeFirst;
var trimAndTransform = function (str, uppercase) {
    if (uppercase === void 0) { uppercase = false; }
    var trimmed = str.trim();
    return uppercase ? trimmed.toUpperCase() : trimmed;
};
exports.trimAndTransform = trimAndTransform;
console.log((0, exports.capitalizeFirst)("hello world"));
console.log((0, exports.trimAndTransform)("  hello  "));
console.log((0, exports.trimAndTransform)("  world  ", true));
function getFirstElement(arr) {
    return arr.length > 0 ? arr[0] : undefined;
}
var numbers = [1, 2, 3, 4, 5];
console.log(getFirstElement(numbers));
var strings = ["a", "b", "c"];
console.log(getFirstElement(strings));
var empty = [];
console.log(getFirstElement(empty));
function findById(items, id) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            return items[i];
        }
    }
    return undefined;
}
var people = [
    { id: 1, name: "Анна" },
    { id: 2, name: "Борис" },
    { id: 3, name: "Виктор" }
];
console.log(findById(people, 2));
console.log(findById(people, 5));
