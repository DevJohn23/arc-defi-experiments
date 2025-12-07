
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract HelloArchitect {
    string private greeting;
    uint256 public totalInteractions; // Adicionamos isso para ser diferente do tutorial básico

    // Evento emitido quando a saudação muda
    event GreetingChanged(string newGreeting);

    constructor() {
        
        greeting = "Hello Arc! borutolixo1 is building here.";
        totalInteractions = 0;
    }

    // Função para atualizar a mensagem
    function setGreeting(string memory newGreeting) public {
        greeting = newGreeting;
        totalInteractions = totalInteractions + 1; // Incrementa o contador
        emit GreetingChanged(newGreeting);
    }

    // Função para ler a mensagem
    function getGreeting() public view returns (string memory) {
        return greeting;
    }
}
