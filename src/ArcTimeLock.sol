// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Arc TimeLock Profit Vault
 * @dev A vault for traders to lock their profits (native USDC) until a specific future date.
 * Features: Multiple locks per user, Reentrancy protection, Time-based logic.
 */
contract ArcTimeLock {
    
    // Structure to hold lock details
    struct Lock {
        uint256 amount;
        uint256 unlockTime;
        bool withdrawn;
    }

    // Mapping: User Address -> Array of Locks (One user can have multiple locks)
    mapping(address => Lock[]) public userLocks;

    // Events for transparency on-chain
    event Locked(address indexed user, uint256 amount, uint256 unlockTime, uint256 lockId);
    event Withdrawn(address indexed user, uint256 amount, uint256 lockId);

    // 1. Function to Lock Funds (Payable = Receives Native USDC)
    // _secondsToLock: How many seconds from now to keep funds locked
    function lockProfits(uint256 _secondsToLock) public payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(_secondsToLock > 0, "Time must be in the future");

        uint256 unlockDate = block.timestamp + _secondsToLock;

        // Create the lock info
        Lock memory newLock = Lock({
            amount: msg.value,
            unlockTime: unlockDate,
            withdrawn: false
        });

        // Add to user's history
        userLocks[msg.sender].push(newLock);
        
        // ID of this specific lock (index in the array)
        uint256 lockId = userLocks[msg.sender].length - 1;

        emit Locked(msg.sender, msg.value, unlockDate, lockId);
    }

    // 2. Function to Withdraw specific lock ID
    function withdrawProfit(uint256 _lockId) public {
        // Validate if lock exists
        require(_lockId < userLocks[msg.sender].length, "Lock ID not found");
        
        // Load lock into storage (to modify it)
        Lock storage myLock = userLocks[msg.sender][_lockId];

        require(!myLock.withdrawn, "Already withdrawn");
        require(block.timestamp >= myLock.unlockTime, "Funds are still time-locked! HODL!");

        // Update state BEFORE transfer (Reentrancy safety pattern)
        myLock.withdrawn = true;

        // Transfer funds back to user
        payable(msg.sender).transfer(myLock.amount);

        emit Withdrawn(msg.sender, myLock.amount, _lockId);
    }

    // 3. Helper to see how many locks a user has
    function getLockCount(address _user) public view returns (uint256) {
        return userLocks[_user].length;
    }
}
