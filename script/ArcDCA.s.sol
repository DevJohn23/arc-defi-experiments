// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {ArcDCA} from "../src/ArcDCA.sol";
import {MockSwap, MockWETH} from "../src/mocks/MockSwap.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployArcDCA is Script {
    function run() external {
        // 1. Configuração da Carteira
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying with account:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 2. Deploy dos Mocks (Infraestrutura de Teste)
        // Cria o WETH falso
        MockWETH weth = new MockWETH();
        console.log("Mock WETH deployed at:", address(weth));

        // Cria a Corretora Falsa (que entrega WETH)
        MockSwap swap = new MockSwap(address(weth));
        console.log("Mock Swap deployed at:", address(swap));

        // 3. Adicionar Liquidez na Corretora
        // O MockWETH nasce na carteira do deployer. Vamos mandar metade para o Swap
        // para que ele tenha fundos para pagar os usuários quando o robô vender USDC.
        uint256 liquidityAmount = 500000 * 10**18;
        weth.transfer(address(swap), liquidityAmount);
        console.log("Liquidity added to Swap");

        // 4. Deploy do Robô (ArcDCA)
        // Conectamos o robô à nossa corretora falsa
        ArcDCA dca = new ArcDCA(address(swap));
        console.log("ArcDCA Bot deployed at:", address(dca));

        vm.stopBroadcast();
    }
}