// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./BaseCrowdsale.sol";

/**
 * @title LimitedTimeCrowdSale
 * @dev Crowdsale with a limit for total contributions.
 */
abstract contract LimitedTimeCrowdSale is BaseCrowdsale {
    using SafeMath for uint256;

    uint256 _openingTime;
    uint256 _closingTime;

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        // solium-disable-next-line security/no-block-members
        require(
            block.timestamp >= openingTime() && block.timestamp <= closingTime()
        );
        _;
    }

    function openingTime() public view returns (uint256) {
        return _openingTime;
    }

    function closingTime() public view returns (uint256) {
        return _closingTime;
    }

    /**
     * @dev Constructor, takes crowdsale opening and closing times.
     * @param openingTime_ Crowdsale opening time
     * @param closingTime_ Crowdsale closing time
     */
    constructor(uint256 openingTime_, uint256 closingTime_) {
        // solium-disable-next-line security/no-block-members
        require(openingTime_ >= block.timestamp);
        require(closingTime_ >= openingTime_);

        _openingTime = openingTime_;
        _closingTime = closingTime_;
    }

    /**
     * @dev Checks whether the period in which the crowdsale is open has already elapsed.
     * @return Whether crowdsale period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp > closingTime();
    }

    /**
     * @dev Extend parent behavior requiring to be within contributing period
     * @param _beneficiary Token purchaser
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
        internal
        view
        virtual
        override
        onlyWhileOpen
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }
}
