// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/ArcLink.sol";

contract ArcLinkScript is Script {
    function run() external returns (ArcLink) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ArcLink arclink = new ArcLink();

        vm.stopBroadcast();
        console.log("ArcLink deployed to:", address(arclink));

        return arclink;
    }
}
