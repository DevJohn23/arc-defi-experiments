// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "src/ArcProfile.sol";
import "src/ArcStream.sol";
import "src/ArcLink.sol";
import "src/ArcDCA.sol";
import "src/mocks/MockSwap.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mocks for DCA
        console.log("Deploying Mocks...");
        MockWETH mockWeth = new MockWETH();
        MockSwap mockSwap = new MockSwap(address(mockWeth));
        console.log("MockWETH deployed to:", address(mockWeth));
        console.log("MockSwap (Router) deployed to:", address(mockSwap));

        // 2. Deploy ArcProfile
        console.log("\nDeploying ArcProfile...");
        ArcProfile arcProfile = new ArcProfile();
        console.log("ArcProfile deployed to:", address(arcProfile));

        // 3. Deploy Core Contracts
        console.log("\nDeploying ArcStream...");
        ArcStream arcStream = new ArcStream();
        console.log("ArcStream deployed to:", address(arcStream));

        console.log("\nDeploying ArcLink...");
        ArcLink arcLink = new ArcLink();
        console.log("ArcLink deployed to:", address(arcLink));

        console.log("\nDeploying ArcDCA...");
        ArcDCA arcDca = new ArcDCA();
        console.log("ArcDCA deployed to:", address(arcDca));

        // 4. Authorize contracts in ArcProfile
        console.log("\nAuthorizing contracts in ArcProfile...");
        arcProfile.authorizeContract(address(arcStream));
        console.log("Authorized ArcStream");
        arcProfile.authorizeContract(address(arcLink));
        console.log("Authorized ArcLink");
        arcProfile.authorizeContract(address(arcDca));
        console.log("Authorized ArcDCA");

        // 5. Set ArcProfile address in other contracts
        console.log("\nSetting ArcProfile address in core contracts...");
        arcStream.setArcProfileAddress(address(arcProfile));
        console.log("Set ArcProfile in ArcStream");
        arcLink.setArcProfileAddress(address(arcProfile));
        console.log("Set ArcProfile in ArcLink");
        arcDca.setArcProfileAddress(address(arcProfile));
        console.log("Set ArcProfile in ArcDCA");
        
        // 6. Set Router address in ArcDCA
        console.log("\nSetting Router address in ArcDCA...");
        arcDca.setRouter(address(mockSwap));
        console.log("Set Router in ArcDCA");

        vm.stopBroadcast();
    }
}
