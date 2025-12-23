// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IArcProfile {
    function addXP(address user, uint256 amount, uint256 badgeId) external;
}
