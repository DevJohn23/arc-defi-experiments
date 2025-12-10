// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "src/ArcStream.sol";

contract DeployArcStream is Script {
    function run() public returns (ArcStream) {
        vm.startBroadcast();
        ArcStream arcStream = new ArcStream();
        vm.stopBroadcast();
        return arcStream;
    }
}
