// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./basecontracts/ERC20Base.sol";
//import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MammothLakesToken
 * @dev MammothLakesToken is a main token contract of ERC20 base token
 * On deployment of the contract tokens minted will be equal to _initialSupply_MLS
 * param(cap_MLS_) - Total Cap
 * param(initialSupply_MLS_) - number of tokens to be minted on deployment
 * param(isTransferEnabled_) - if transfer if tokens enabled or not
 *
 * By default transfer of tokens will be diabled, to enable transfer call enableTransfer method by Contract Owner or pass isTransferEnabled_ as true.
 *
 * Percentage of tokens to burn will round the values to integer.
 * Incase of calulated result is below 1 for e.g. 0.3 tokens to burn will be 1.
 *
 *
 */


contract MammothLakesToken is ERC20Base {
    using SafeMath for uint256;
    //using Strings for uint256;

    string _name_MLS = "Mammoth Lakes";
    string _symbol_MLS = "MLS";
    uint8 _decimals_MLS = 18;

    uint256 _percentOfTokensToBurn = 100; //1%

    uint256 _maxTokenHoldLimit;
    uint256 _minTokenTransferRequired;

    address _vault;

    constructor(
        uint256 cap_MLS_,
        uint256 initialSupply_MLS_,
        bool isTransferEnabled_,
        uint256 maxTokenHoldLimit_,
        uint256 minTokenTransferRequired_,
        address vault_
    )
        ERC20Base(
            _name_MLS,
            _symbol_MLS,
            _decimals_MLS,
            cap_MLS_,
            initialSupply_MLS_,
            isTransferEnabled_
        )
    {
        _maxTokenHoldLimit = maxTokenHoldLimit_;
        _minTokenTransferRequired = minTokenTransferRequired_;
        _vault = vault_;
    }

    function getVaultAddress() public view returns (address) {
        return _vault;
    }

    function ceil(uint256 a, uint256 m) internal pure returns (uint256) {
        uint256 c = SafeMath.add(a, m);
        uint256 d = SafeMath.sub(c, 1);
        return SafeMath.mul(SafeMath.div(d, m), m);
    }

    function findPercentToBurn(uint256 value) public view returns (uint256) {
        uint256 roundValue = ceil(value, _percentOfTokensToBurn);
        uint256 onePercent = roundValue.mul(_percentOfTokensToBurn).div(10000);
        return onePercent;
    }


    function transfer(address to, uint256 value)
        public virtual override(ERC20Base) canTransfer(_msgSender())
        returns (bool)
    {
        require(value >= _minTokenTransferRequired, "MammothLakesToken: Tokens to transfer should be more than minimum.");

        uint256 tokensToBurn = findPercentToBurn(value);
        uint256 tokensToTransfer = value.sub(tokensToBurn);
        
        uint256 _existingContribution = balanceOf(to);
        uint256 _newContribution = _existingContribution.add(tokensToTransfer);
        require(_newContribution <= _maxTokenHoldLimit, "MammothLakesToken: Tokens transferred exceeds Max Hold limit of recipient.");


        super.transfer(to, tokensToTransfer);
        super.transfer(_vault, tokensToBurn);

        return true;
    }


    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public virtual override(ERC20Base) canTransfer(from) returns (bool) {
        return super.transferFrom(from, to, value);
    }

   
}
