const MammothLakesToken = artifacts.require("MammothLakesToken");
var Web3 = require('web3');

module.exports = function (deployer) {
 
  deployer.deploy(
    MammothLakesToken, Web3.utils.toWei("100000","ether"), 
    Web3.utils.toWei("20000","ether"), 
    true, 
    Web3.utils.toWei("1000","ether"), 
    Web3.utils.toWei("100","ether"));
};
