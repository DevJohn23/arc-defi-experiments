// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// 1. Um Token WETH falso para recebermos na troca
contract MockWETH is ERC20 {
    constructor() ERC20("Mock Wrapped Ether", "mWETH") {
        _mint(msg.sender, 1000000 * 10**18); // Mint inicial para quem der deploy
    }
}

// 2. A Corretora Falsa
contract MockSwap {
    address public immutable tokenOut; // O WETH que vamos entregar

    constructor(address _tokenOut) {
        tokenOut = _tokenOut;
    }

    // Simula uma troca: Recebe TokenIn -> Envia TokenOut (1:1)
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Expired");
        
        // Pega os tokens do usuário (USDC)
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        // Envia o Token de destino (MockWETH) para o usuário
        IERC20(tokenOut).transfer(to, amountIn);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
        return amounts;
    }
}