
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract ArcVault {
    // Mapeamento para guardar quanto cada pessoa tem no banco
    mapping(address => uint256) private balances;

    // Eventos para registrar na blockchain (o "extrato" bancário)
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    // Função para DEPOSITAR (Payable permite receber o token nativo/USDC)
    function deposit() public payable {
        require(msg.value > 0, "Voce precisa enviar algum valor");
        
        // Atualiza o saldo do usuário
        balances[msg.sender] += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }

    // Função para SACAR
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Saldo insuficiente");
        
        // Deduz o saldo antes de enviar (segurança contra reentrância)
        balances[msg.sender] -= amount;
        
        // Envia o valor de volta para o usuário
        payable(msg.sender).transfer(amount);
        
        emit Withdrawal(msg.sender, amount);
    }

    // Função para ver o saldo
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
    
    // Função para ver quanto o contrato tem no total
    function getVaultTotal() public view returns (uint256) {
        return address(this).balance;
    }
}
