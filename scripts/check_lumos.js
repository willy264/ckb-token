const lumos = require("@ckb-lumos/lumos");
console.log("Keys in @ckb-lumos/lumos:", Object.keys(lumos));
if (lumos.commons) console.log("Keys in commons:", Object.keys(lumos.commons));
if (lumos.helpers) console.log("Keys in helpers:", Object.keys(lumos.helpers));
