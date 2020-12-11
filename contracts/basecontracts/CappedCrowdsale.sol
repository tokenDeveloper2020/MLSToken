// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./BaseCrowdsale.sol";

/**
 * @title CappedCrowdsale
 * @dev Crowdsale with a limit for total contributions.
 */
abstract contract CappedCrowdsale is BaseCrowdsale {
    using SafeMath for uint256;

    uint256 private _cap;

    /**
     * @dev Constructor, takes maximum amount of wei accepted in the crowdsale.
     * @param cap_ Max amount of wei to be contributed
     */
    constructor(uint256 cap_) {
        require(cap_ > 0);
        _cap = cap_;
    }

    function cap() public view returns (uint256) {
        return _cap;
    }

    /**
     * @dev Checks whether the cap has been reached.
     * @return Whether the cap was reached
     */
    function capReached() public view returns (bool) {
        return weiRaised() >= cap();
    }

    /**
     * @dev Extend parent behavior requiring purchase to respect the funding cap.
     * @param _beneficiary Token purchaser
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
        internal
        view
        virtual
        override
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        require(weiRaised().add(_weiAmount) <= cap());
    }
}
