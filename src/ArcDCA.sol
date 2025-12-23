// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

// --- Interfaces ---

interface IRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

import "src/interfaces/IArcProfile.sol";


contract ArcDCA is Ownable {
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
    address public router; // Endereço da Corretora (Swap)
    address public arcProfile;

    event Deposited(uint256 indexed positionId, uint256 amount);
    event Executed(uint256 indexed positionId, uint256 amountIn, uint256 amountOut);
    event ArcProfileAddressSet(address indexed arcProfileAddress);
    event RouterSet(address indexed routerAddress);

    constructor() Ownable(msg.sender) {}

    // --- Owner Functions ---

    function setArcProfileAddress(address _arcProfileAddress) external onlyOwner {
        arcProfile = _arcProfileAddress;
        emit ArcProfileAddressSet(_arcProfileAddress);
    }
    
    function setRouter(address _router) external onlyOwner {
        router = _router;
        emit RouterSet(_router);
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

        // --- Gamification Hook ---
        if (arcProfile != address(0)) {
            try IArcProfile(arcProfile).addXP(msg.sender, 30, 2) { // 30 XP, Badge 2 (Investor)
                // Success, do nothing
            } catch {
                // Failure is silent, do not revert the main transaction
            }
        }
    }

    // 2. Executar a Compra (Pode ser chamado por qualquer um / Bot)
    function executeDCA(uint256 _positionId) external {
        Position storage pos = positions[_positionId];
        
        require(pos.isActive, "Position inactive");
        require(pos.totalBalance >= pos.amountPerTrade, "Insufficient funds");
        require(block.timestamp >= pos.lastExecution + pos.interval, "Too early");
        require(router != address(0), "Router not set");

        // Atualiza estado (Checks-Effects)
        pos.lastExecution = block.timestamp;
        pos.totalBalance -= pos.amountPerTrade;

        // Aprova o Router a gastar
        IERC20(pos.tokenIn).approve(router, pos.amountPerTrade);

        address[] memory path = new address[](2);
        path[0] = pos.tokenIn;
        path[1] = pos.tokenOut;

        // Executa o Swap
        uint[] memory amounts = IRouter(router).swapExactTokensForTokens(
            pos.amountPerTrade,
            0, // Slippage 0 para teste
            path,
            pos.owner, // Manda o lucro direto pro dono
            block.timestamp
        );

        emit Executed(_positionId, pos.amountPerTrade, amounts[1]);
    }
}