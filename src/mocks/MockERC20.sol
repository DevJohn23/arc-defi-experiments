// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/interfaces/IERC20.sol";

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function _mint(address _to, uint256 _amount) internal {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
        emit Transfer(address(0), _to, _amount);
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function transfer(address _to, uint256 _amount) public override returns (bool) {
        require(balanceOf[msg.sender] >= _amount, "ERC20: transfer amount exceeds balance");
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;
        emit Transfer(msg.sender, _to, _amount);
        return true;
    }

    function approve(address _spender, uint256 _amount) public override returns (bool) {
        allowance[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _amount) public override returns (bool) {
        require(balanceOf[_from] >= _amount, "ERC20: transfer amount exceeds balance");
        require(allowance[_from][msg.sender] >= _amount, "ERC20: transfer amount exceeds allowance");
        
        allowance[_from][msg.sender] -= _amount;
        balanceOf[_from] -= _amount;
        balanceOf[_to] += _amount;
        emit Transfer(_from, _to, _amount);
        return true;
    }
}
