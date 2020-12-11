const MammothLakesToken = artifacts.require("MammothLakesToken");

module.exports = function (deployer) {
  deployer.deploy(MammothLakesToken, 100000, 20000, true, 1000, 100, '0x1999e57Bf5A905B12d6517fc388ef134aaFa0633');
};
