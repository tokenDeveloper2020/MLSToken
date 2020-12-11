const MammothLakesToken = artifacts.require("./MammothLakesToken.sol");

contract("MammothLakesToken", (accounts) => {
  let mammothLakesToken = null;
  var upperCap = 100000; //100K max limit
  var intitalTokens = 20000; //initial supply 20K
  var remint = 10000; //initial supply 20K

  var owner = accounts[0]; //address 0 is owner of contract
  var user1 = accounts[1]; //treat this account as user 1
  var user2 = accounts[2]; //treat this account as user 2
  var vault = accounts[9];//'0x1999e57Bf5A905B12d6517fc388ef134aaFa0633';

  var tokensToTransferByOwner = 900;
  var tokensToBeReceivedByUser1 = 891; //99% of token transferred
  var tokensToTransferToVaultForBurn = 9; //1% of tokens transferred

  var minimumTransferLimit = 100;
  var maximumHoldLimit = 1000;

  before(async () => {
    mammothLakesToken = await MammothLakesToken.deployed();
  });

  //**********************************************************
  //TEST TO VERIFY CONTRACT PROPERTIES
  //**********************************************************

  it("should initialize the token contract with correct values", async () => {
    //get token name
    const name = await mammothLakesToken.name();
    assert.equal(name, "Mammoth Lakes", "name should be Mammoth Lakes");

    const symbol = await mammothLakesToken.symbol();
    assert.equal(symbol, "MLS", "symbol should be MLS");

    const decimals = await mammothLakesToken.decimals();
    assert.equal(decimals, 18, "decimals should be 18");

    const cap = await mammothLakesToken.cap();
    assert.equal(cap, upperCap, "cap should be " + upperCap);

    const totalSupply = await mammothLakesToken.totalSupply();
    assert.equal(
      totalSupply.toNumber(),
      intitalTokens,
      "inital tolen supply should be " + intitalTokens
    );

    const transferEnabled = await mammothLakesToken.transferEnabled();
    assert.equal(transferEnabled, true, "transfer should be enabled");

    const vaultAddress = await mammothLakesToken.getVaultAddress();
    assert.equal(vaultAddress, vault, "vault address initialized");
  });

  //**********************************************************
  //START MINTING TEST
  //**********************************************************

  //test to verify minting above CAP should 
  it("should not allow minting tokens more than CAP", async () => {
    try {
      await mammothLakesToken.mint.call(accounts[0], upperCap + 1);
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
    assert(totalSupplyAfterMint.toNumber() === totalSupplyBeforeMint.toNumber() + remint, "After Minting TotalSupply should be OldSupply + New Mint");
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

  it("should not allow transfer tokens less than minimum required", async () => {
    try {
      await mammothLakesToken.transfer.call(user1, (minimumTransferLimit - 1), { from: owner });
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
      await mammothLakesToken.transfer.call(user1, (maximumHoldLimit + 12), { from: owner });
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
    assert(getBalanceOfUser2.toNumber() === 891, "Receiver must receive 891 after 1% burn transfer to vault");
    try {
      //should throw error as exceeds limit
      await mammothLakesToken.transfer(user2, tokensToTransferByOwner, { from: owner });
    } catch (e) {
      assert(e.message.includes("MammothLakesToken: Tokens transferred exceeds Max Hold limit of recipient."));
      return;
    }
    assert(false, "Receiver hold tokens more than limit.");
  });

  //tokens transferred should be equal to old balance + (transferred - burn);
  //should emit events
  it("should facilitate transfer to receiver 99% and vault address 1% for buring", async () => {

    var getBalanceOfOwnerBeforeTransfer = await mammothLakesToken.balanceOf(owner);
    var getBalanceOfUser1BeforeTransfer = await mammothLakesToken.balanceOf(user1);
    var getBalanceOfVaultBeforeTransfer = await mammothLakesToken.balanceOf(vault);

    var receipt = await mammothLakesToken.transfer(user1, tokensToTransferByOwner, { from: owner });
    
    var getBalanceOfOwnerAfterTransfer = await mammothLakesToken.balanceOf(owner);
    var getBalanceOfUser1AfterTransfer = await mammothLakesToken.balanceOf(user1);
    var getBalanceOfVaultAfterTransfer = await mammothLakesToken.balanceOf(vault);

    var tokensReceivedByUser1 = getBalanceOfUser1AfterTransfer.toNumber() - getBalanceOfUser1BeforeTransfer.toNumber();
    var tokensReceivedByVault = getBalanceOfVaultAfterTransfer.toNumber() - getBalanceOfVaultBeforeTransfer.toNumber();
    var totalTokensReceived = tokensReceivedByUser1 + tokensReceivedByVault;
    var tokensSentByOwner = getBalanceOfOwnerBeforeTransfer.toNumber() - getBalanceOfOwnerAfterTransfer.toNumber();

    assert.equal(tokensReceivedByVault, tokensToTransferToVaultForBurn, "tokens received by vault address for burning should be " + tokensToTransferToVaultForBurn);
    assert.equal(tokensReceivedByUser1, tokensToBeReceivedByUser1, "tokens received by user should be " + tokensToBeReceivedByUser1);
    assert.equal(totalTokensReceived, tokensSentByOwner, "Tokens sent by owner should be equal to received by User and vault " + tokensSentByOwner);
    assert.equal(tokensSentByOwner, tokensToTransferByOwner, "Actual tokens sent should be equal to tokens sent by owner " + tokensSentByOwner);
    assert.equal(totalTokensReceived, tokensToTransferByOwner, "Tokens received by User and vault should be equal to tokens transfered" + tokensToTransferByOwner);

    assert.equal(receipt.logs.length, 2, 'trigger two event');

    assert.equal(receipt.logs[0].event, 'Transfer', 'should be transfer event');
    assert.equal(receipt.logs[0].args.from, owner, 'logs the account the tokens are transferred from');
    assert.equal(receipt.logs[0].args.to, user1, 'logs the account the tokens are transferred to should be User');
    assert.equal(receipt.logs[0].args.value, tokensToBeReceivedByUser1, 'logs the transfer amount');

    assert.equal(receipt.logs[1].event, 'Transfer', 'should be transfer event');
    assert.equal(receipt.logs[1].args.from, owner, 'logs the account the tokens are transferred from');
    assert.equal(receipt.logs[1].args.to, vault, 'logs the account the tokens are transferred to should be vault');
    assert.equal(receipt.logs[1].args.value, tokensToTransferToVaultForBurn, 'logs the transfer amount');
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
    var amountToBurn = vaultBalanceBeforeBurn.toNumber();

    //var approveBurn = await mammothLakesToken.approve()
    var receipt = await mammothLakesToken.burn(amountToBurn, { from: vault });

    var vaultBalanceAfterBurn = await mammothLakesToken.balanceOf(vault);
    var balanceToRemain = vaultBalanceBeforeBurn.toNumber() - amountToBurn;

    assert.equal(vaultBalanceAfterBurn.toNumber(), balanceToRemain, 'Address balance should be Before Balance - Amount Burn');

    assert.equal(receipt.logs.length, 1, 'trigger one event');
    assert.equal(receipt.logs[0].event, 'Transfer', 'should be transfer event');
    assert.equal(receipt.logs[0].args.from, vault, 'logs the account the tokens are burnt from');
    assert.equal(receipt.logs[0].args.to, 0x0, 'logs the account the tokens are transferred should be zero account');
    assert.equal(receipt.logs[0].args.value, amountToBurn, 'logs the transfer amount');
  });
  //***************END BURN TEST**************************

});
