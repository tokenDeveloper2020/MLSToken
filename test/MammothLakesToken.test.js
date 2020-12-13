const MammothLakesToken = artifacts.require("./MammothLakesToken.sol");
var Web3 = require('web3');
var BigNumber = require('bignumber.js');
var BN = Web3.utils.BN;

contract("MammothLakesToken", (accounts) => {

  let mammothLakesToken = null;
  var upperCap = Web3.utils.toWei("100000", "ether"); //100K max limit
  var intitalTokens = Web3.utils.toWei("20000", "ether"); //initial supply 20K
  var remint = Web3.utils.toWei("10000", "ether");; //initial supply 20K

  var owner = accounts[0]; //address 0 is owner of contract
  var user1 = accounts[1]; //treat this account as user 1
  var user2 = accounts[2]; //treat this account as user 2
  var vault = accounts[9];//'0x1999e57Bf5A905B12d6517fc388ef134aaFa0633';

  var tokensToTransferByOwner = Web3.utils.toWei("900", "ether");
  var tokensToBeReceivedByUser1 = Web3.utils.toWei("891", "ether"); //99% of token transferred
  var tokensToTransferToVaultForBurn = Web3.utils.toWei("9", "ether"); //1% of tokens transferred

  var minimumTransferLimit = Web3.utils.toWei("100", "ether");
  var maximumHoldLimit = Web3.utils.toWei("1000", "ether");
  var moreThanUpperCap = Web3.utils.toWei("1000000", "ether");

  before(async () => {
    mammothLakesToken = await MammothLakesToken.deployed();
  });

  //**********************************************************
  //TEST TO VERIFY CONTRACT PROPERTIES
  //**********************************************************
  // it("test", async () => {
  //   const name = await mammothLakesToken.test();
  //   console.log(name+"-------------");
  // });


  it("should initialize the token contract with correct values", async () => {
    //get token name
    const name = await mammothLakesToken.name();
    assert.equal(name, "Mammoth Lakes", "name should be Mammoth Lakes");

    const symbol = await mammothLakesToken.symbol();
    assert.equal(symbol, "MLS", "symbol should be MLS");

    const decimals = await mammothLakesToken.decimals();
    assert.equal(decimals, 18, "decimals should be 18");

    const cap = await mammothLakesToken.cap();
    assert.equal(cap.toString(), upperCap.toString(), "cap should be " + upperCap);

    const totalSupply = await mammothLakesToken.totalSupply();

    assert.equal(
      totalSupply.toString(),
      intitalTokens.toString(),
      "inital tolen supply should be " + intitalTokens
    );

    const transferEnabled = await mammothLakesToken.transferEnabled();
    assert.equal(transferEnabled, true, "transfer should be enabled");

  });

  //**********************************************************
  //START MINTING TEST
  //**********************************************************

  //test to verify minting above CAP should 
  it("should not allow minting tokens more than CAP", async () => {
    try {
      await mammothLakesToken.mint.call(accounts[0], moreThanUpperCap);
    } catch (e) {
      assert(e.message.includes("ERC20Capped: cap exceeded"));
      return;
    }
    assert(false, "should not allow minting tokens more than CAP");
  });

  //test to verify minting correctly
  it("should allow mint tokens", async () => {
    //get current token supply
    const totalSupplyBeforeMint = await mammothLakesToken.totalSupply();

    //mint new tokens
    await mammothLakesToken.mint(accounts[0], remint);

    //get new token supply
    const totalSupplyAfterMint = await mammothLakesToken.totalSupply();

    //verify new token supply === Old supply plus minted tokens
    assert.equal(totalSupplyAfterMint.toString(),
      web3.utils.toBN(totalSupplyBeforeMint).add(web3.utils.toBN(remint)).toString(),
      "After Minting TotalSupply should be OldSupply + New Mint");
  });

  //test to verify minting by non owner not allowed
  it("should not allow mint tokens other than owner", async () => {
    try {
      await mammothLakesToken.mint.call(accounts[0], remint, { from: user1 });
    } catch (e) {
      assert(e.message.includes("revert Roles: caller does not have the MINTER role"));
      return;
    }
    assert(false, "should not allow mint tokens other than owner");
  });

  //***************END MINTING TEST***************************


  //**********************************************************
  //START TRANSFER TEST
  //**********************************************************
  it("should not allow transfer tokens when valut address not set", async () => {
    try {
      await mammothLakesToken.transfer.call(user1, minimumTransferLimit, { from: owner });
    } catch (e) {
      assert(e.message.includes("MammothLakesToken: Vault is not setup yet."));
      return;
    }
    assert(false, "Vault is not setup yet.");
  });

  it("should setup vault address correctly", async () => {
    await mammothLakesToken.setVaultAddress(vault);

    var vaultAddress = await mammothLakesToken.getVaultAddress();
    assert.equal(vaultAddress, vault, "Vault address equals to user at index 9");
  });

  it("should not allow transfer tokens less than minimum required", async () => {
    try {
      await mammothLakesToken.transfer.call(user1, Web3.utils.toBN(minimumTransferLimit).sub(Web3.utils.toBN(Web3.utils.toWei("1","ether"))), { from: owner });
    } catch (e) {
      assert(e.message.includes("MammothLakesToken: Tokens to transfer should be more than minimum."));
      return;
    }
    assert(false, "Tokens transfer less than minimum required.");
  });

  //should not allow transfer more than hold limit
  it("should not allow transfer tokens more than hold limit", async () => {
    try {
      //try to transfer 1012, out of which 11 will be for burn and 1001 for final transfer and should fail
      await mammothLakesToken.transfer.call(user1, Web3.utils.toBN(maximumHoldLimit).add(Web3.utils.toBN(Web3.utils.toWei("12","ether"))), { from: owner });
    } catch (e) {
      assert(e.message.includes("MammothLakesToken: Tokens transferred exceeds Max Hold limit of recipient."));
      return;
    }
    assert(false, "Tokens transfer more than hold limit.");
  });

  //should not allow to hold more than limit with multiple transfer
  it("should not allow hold tokens more than hold limit with multiple transfer", async () => {
    //try to transfer 900 tokens will success
    await mammothLakesToken.transfer(user2, tokensToTransferByOwner, { from: owner });
    var getBalanceOfUser2 = await mammothLakesToken.balanceOf(user2);
    assert(getBalanceOfUser2.toString() === tokensToBeReceivedByUser1.toString(), "Receiver must receive 891 after 1% burn transfer to vault");
    try {
      //should throw error as exceeds limit
      await mammothLakesToken.transfer(user2, tokensToTransferByOwner, { from: owner });
    } catch (e) {
      assert(e.message.includes("MammothLakesToken: Tokens transferred exceeds Max Hold limit of recipient."));
      return;
    }
    assert(false, "Receiver hold tokens more than limit.");
  });

  // //tokens transferred should be equal to old balance + (transferred - burn);
  // //should emit events
  it("should facilitate transfer to receiver 99% and vault address 1% for buring", async () => {

    var getBalanceOfOwnerBeforeTransfer = await mammothLakesToken.balanceOf(owner);
    var getBalanceOfUser1BeforeTransfer = await mammothLakesToken.balanceOf(user1);
    var getBalanceOfVaultBeforeTransfer = await mammothLakesToken.balanceOf(vault);

    var receipt = await mammothLakesToken.transfer(user1, tokensToTransferByOwner, { from: owner });

    var getBalanceOfOwnerAfterTransfer = await mammothLakesToken.balanceOf(owner);
    var getBalanceOfUser1AfterTransfer = await mammothLakesToken.balanceOf(user1);
    var getBalanceOfVaultAfterTransfer = await mammothLakesToken.balanceOf(vault);

    var tokensReceivedByUser1 = getBalanceOfUser1AfterTransfer.sub(getBalanceOfUser1BeforeTransfer);
    var tokensReceivedByVault = getBalanceOfVaultAfterTransfer.sub(getBalanceOfVaultBeforeTransfer);
    var totalTokensReceived = tokensReceivedByUser1.add(tokensReceivedByVault);
    var tokensSentByOwner = getBalanceOfOwnerBeforeTransfer.sub(getBalanceOfOwnerAfterTransfer);

    assert.equal(tokensReceivedByVault.toString(), Web3.utils.toBN(tokensToTransferToVaultForBurn).toString(), "tokens received by vault address for burning should be " + Web3.utils.toBN(tokensToTransferToVaultForBurn).toString());
    assert.equal(tokensReceivedByUser1.toString(), Web3.utils.toBN(tokensToBeReceivedByUser1).toString(), "tokens received by user should be " + Web3.utils.toBN(tokensToBeReceivedByUser1).toString());
    assert.equal(totalTokensReceived.toString(), tokensSentByOwner.toString(), "Tokens sent by owner should be equal to received by User and vault " + tokensSentByOwner.toString());
    assert.equal(tokensSentByOwner.toString(), Web3.utils.toBN(tokensToTransferByOwner).toString(), "Actual tokens sent should be equal to tokens sent by owner " + Web3.utils.toBN(tokensSentByOwner).toString());
    assert.equal(totalTokensReceived.toString(), Web3.utils.toBN(tokensToTransferByOwner).toString(), "Tokens received by User and vault should be equal to tokens transfered" + Web3.utils.toBN(tokensToTransferByOwner).toString());

    assert.equal(receipt.logs.length, 2, 'trigger two event');

    assert.equal(receipt.logs[0].event, 'Transfer', 'should be transfer event');
    assert.equal(receipt.logs[0].args.from, owner, 'logs the account the tokens are transferred from');
    assert.equal(receipt.logs[0].args.to, user1, 'logs the account the tokens are transferred to should be User');
    assert.equal(receipt.logs[0].args.value.toString(), tokensToBeReceivedByUser1.toString(), 'logs the transfer amount');

    assert.equal(receipt.logs[1].event, 'Transfer', 'should be transfer event');
    assert.equal(receipt.logs[1].args.from, owner, 'logs the account the tokens are transferred from');
    assert.equal(receipt.logs[1].args.to, vault, 'logs the account the tokens are transferred to should be vault');
    assert.equal(receipt.logs[1].args.value.toString(), tokensToTransferToVaultForBurn.toString(), 'logs the transfer amount');
  });

  //***************END TRANSFER TEST**************************

  //**********************************************************
  //START BURN TEST
  //**********************************************************

  //should not be allowed burn from more than allowance
  it("should not allow burn from more than allowance", async () => {
    var vaultBalance = await mammothLakesToken.balanceOf(vault);
    try {
      await mammothLakesToken.burnFrom.call(vault, vaultBalance, { from: user1 });
    } catch (e) {
      assert(e.message.includes("ERC20: burn amount exceeds allowance"));
      return;
    }
    assert(false, "burn amount exceeds allowance.");
  });

  it("should not allow burn more than balance", async () => {
    var vaultBalance = await mammothLakesToken.balanceOf(vault);
    try {
      await mammothLakesToken.burn.call(vaultBalance + 100, { from: vault });
    } catch (e) {
      assert(e.message.includes("ERC20: burn amount exceeds balance"));
      return;
    }
    assert(false, "burn amount exceeds balance");
  });

  it("should allow burn all balance", async () => {
    var vaultBalanceBeforeBurn = await mammothLakesToken.balanceOf(vault);
    var amountToBurn = vaultBalanceBeforeBurn;

    //var approveBurn = await mammothLakesToken.approve()
    var receipt = await mammothLakesToken.burn(amountToBurn, { from: vault });

    var vaultBalanceAfterBurn = await mammothLakesToken.balanceOf(vault);
    var balanceToRemain = vaultBalanceBeforeBurn.sub(Web3.utils.toBN(amountToBurn));

    assert.equal(vaultBalanceAfterBurn.toString(), balanceToRemain.toString(), 'Address balance should be Before Balance - Amount Burn');

    assert.equal(receipt.logs.length, 1, 'trigger one event');
    assert.equal(receipt.logs[0].event, 'Transfer', 'should be transfer event');
    assert.equal(receipt.logs[0].args.from, vault, 'logs the account the tokens are burnt from');
    assert.equal(receipt.logs[0].args.to, 0x0, 'logs the account the tokens are transferred should be zero account');
    assert.equal(receipt.logs[0].args.value.toString(), amountToBurn.toString(), 'logs the transfer amount');
  });
  //***************END BURN TEST**************************

});
