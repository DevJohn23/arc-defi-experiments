// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract ArcDCA {
    // Estrutura de cada investimento
    struct Position {
        address owner;          // Dono do dinheiro
        address tokenIn;        // O que ele deposita (ex: USDC)
        address tokenOut;       // O que ele quer comprar (ex: WETH)
        uint256 amountPerTrade; // Quanto comprar por vez
        uint256 interval;       // A cada quanto tempo (segundos)
        uint256 lastExecution;  // Última vez que comprou
        uint256 totalBalance;   // Saldo restante
        bool isActive;          // Se está ativo
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId;
    address public immutable router; // Endereço da Corretora (Swap)

    event Deposited(uint256 indexed positionId, uint256 amount);
    event Executed(uint256 indexed positionId, uint256 amountIn, uint256 amountOut);

    constructor(address _router) {
        router = _router;
    }

    // 1. Criar Investimento Automático
    function createPosition(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountPerTrade,
        uint256 _interval,
        uint256 _totalDeposit
    ) external {
        require(_totalDeposit >= _amountPerTrade, "Deposit too small");
        
        // Puxa o dinheiro para o contrato
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _totalDeposit);

        positions[nextPositionId] = Position({
            owner: msg.sender,
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            amountPerTrade: _amountPerTrade,
            interval: _interval,
            lastExecution: 0, 
            totalBalance: _totalDeposit,
            isActive: true
        });

        emit Deposited(nextPositionId, _totalDeposit);
        nextPositionId++;
    }

    // 2. Executar a Compra (Pode ser chamado por qualquer um / Bot)
    function executeDCA(uint256 _positionId) external {
        Position storage pos = positions[_positionId];
        
        require(pos.isActive, "Position inactive");
        require(pos.totalBalance >= pos.amountPerTrade, "Insufficient funds");
        require(block.timestamp >= pos.lastExecution + pos.interval, "Too early");

        // Atualiza estado (Checks-Effects)
        pos.lastExecution = block.timestamp;
        pos.totalBalance -= pos.amountPerTrade;

        // Aprova o Router a gastar
        IERC20(pos.tokenIn).approve(router, pos.amountPerTrade);

        address[] memory path = new address[](2);
        path[0] = pos.tokenIn;
        path[1] = pos.tokenOut;

        // Executa o Swap
        IRouter(router).swapExactTokensForTokens(
            pos.amountPerTrade,
            0, // Slippage 0 para teste
            path,
            pos.owner, // Manda o lucro direto pro dono
            block.timestamp
        );

        emit Executed(_positionId, pos.amountPerTrade, 0);
    }
}