const rawData = '2025-12-01';
const data = new Date(rawData);
console.log("String parsing:");
console.log("rawData:", rawData);
console.log("toISOString:", data.toISOString());
console.log("substring:", data.toISOString().substring(0, 7));

const rawData2 = '2025-12-01T00:00:00.000Z';
const data2 = new Date(rawData2);
console.log("\nISO String parsing:");
console.log("toISOString:", data2.toISOString());
console.log("substring:", data2.toISOString().substring(0, 7));

const rawData3 = new Date(2025, 11, 1); // Month is 0-indexed (11 = Dec)
console.log("\nLocal Date creation:");
console.log("toISOString:", rawData3.toISOString());
console.log("substring:", rawData3.toISOString().substring(0, 7));
