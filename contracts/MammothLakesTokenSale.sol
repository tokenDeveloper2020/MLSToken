// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./basecontracts/BaseCrowdsale.sol";
import "./basecontracts/CappedCrowdsale.sol";
import "./basecontracts/LimitedTimeCrowdSale.sol";

abstract contract MammothLakesTokenSale is
    BaseCrowdsale,
    CappedCrowdsale,
    LimitedTimeCrowdSale
{
    using SafeMath for uint256;
    uint256 _investorMinCap = 0;
    uint256 _investorHardCap = 0;

    constructor(
        uint256 rate_,
        address payable wallet_,
        IERC20 token_,
        uint256 cap_,
        uint256 openingTime_,
        uint256 closingTime_,
        uint256 investorMinCap_,
        uint256 investorHardCap_
    )
        BaseCrowdsale(rate_, wallet_, token_)
        CappedCrowdsale(cap_)
        LimitedTimeCrowdSale(openingTime_, closingTime_)
    {
        _investorMinCap = investorMinCap_;
        _investorHardCap = investorHardCap_;
    }

    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
        internal
        view
        virtual
        override(BaseCrowdsale, CappedCrowdsale, LimitedTimeCrowdSale)
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);

        uint256 _existingContribution = weiContribution(_beneficiary);
        uint256 _newContribution = _existingContribution.add(_weiAmount);

        if (_investorMinCap > 0) require(_newContribution >= _investorMinCap);

        if (_investorHardCap > 0) require(_newContribution <= _investorHardCap);
    }
}
