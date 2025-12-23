// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ArcProfile
 * @author Your Name
 * @notice A Soulbound ERC-721 token for on-chain reputation (Arc Passport).
 *         NFTs represent user profiles and are non-transferable.
 */
contract ArcProfile is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // --- State Variables ---

    // Gamification data
    mapping(address => uint256) public xp;
    mapping(address => uint256) public level;
    mapping(address => bool[3]) public badges; // 0: Streamer, 1: Linker, 2: Investor

    // Authorization for other contracts to add XP
    mapping(address => bool) public authorizedContracts;

    // --- Events ---

    event ProfileMinted(address indexed user, uint256 tokenId);
    event XPAdded(address indexed user, uint256 amount, uint256 badgeId);
    event LevelUp(address indexed user, uint256 newLevel);
    event ContractAuthorized(address indexed contractAddress);
    event ContractRevoked(address indexed contractAddress);

    // --- Errors ---

    error AlreadyHasProfile();
    error NotAuthorized();
    error InvalidBadgeId();

    // --- Constructor ---

    constructor() ERC721("Arc Passport", "ARCP") Ownable(msg.sender) {}

    // --- Soulbound Implementation ---

    /**
     * @dev Hook that is called before any token transfer.
     * Overridden to prevent transfers, making the token Soulbound.
     * The only allowed transfers are minting (from address(0)) and burning (to address(0)).
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("This is a Soulbound token and cannot be transferred.");
        }
        return super._update(to, tokenId, auth);
    }
    
    function transferFrom(address, address, uint256) public pure override {
        revert("This is a Soulbound token and cannot be transferred.");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("This is a Soulbound token and cannot be transferred.");
    }

    // --- Public Functions ---

    /**
     * @notice Mints a new profile NFT for the caller.
     * Reverts if the user already has a profile.
     */
    function mintProfile() external {
        if (balanceOf(msg.sender) > 0) {
            revert AlreadyHasProfile();
        }

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);

        level[msg.sender] = 1; // Start at level 1

        emit ProfileMinted(msg.sender, tokenId);
    }

    // --- Protected Functions ---

    /**
     * @notice Adds Experience Points (XP) to a user and potentially awards a badge.
     * Can only be called by authorized contracts.
     * @param user The address of the user to receive XP.
     * @param amount The amount of XP to add.
     * @param badgeId The ID of the badge to award (0: Streamer, 1: Linker, 2: Investor).
     */
    function addXP(address user, uint256 amount, uint256 badgeId) external {
        if (!authorizedContracts[msg.sender]) {
            revert NotAuthorized();
        }
        if (badgeId > 2) {
            revert InvalidBadgeId();
        }

        // Add XP
        xp[user] += amount;

        // Award badge if not already awarded
        if (!badges[user][badgeId]) {
            badges[user][badgeId] = true;
        }

        // Check for level up
        uint256 currentLevel = level[user];
        uint256 newLevel = calculateLevel(xp[user]);
        if (newLevel > currentLevel) {
            level[user] = newLevel;
            emit LevelUp(user, newLevel);
        }

        emit XPAdded(user, amount, badgeId);
    }

    // --- Owner Functions ---

    /**
     * @notice Authorizes a contract to call the `addXP` function.
     * @param _contract The address of the contract to authorize.
     */
    function authorizeContract(address _contract) external onlyOwner {
        authorizedContracts[_contract] = true;
        emit ContractAuthorized(_contract);
    }
    
    /**
     * @notice Revokes authorization from a contract.
     * @param _contract The address of the contract to revoke.
     */
    function revokeContract(address _contract) external onlyOwner {
        authorizedContracts[_contract] = false;
        emit ContractRevoked(_contract);
    }

    // --- View Functions ---

    /**
     * @notice Calculates the level based on the total XP.
     * This is a simple example. A real implementation might use a more complex formula.
     * Formula: level = floor(sqrt(xp / 100)) + 1
     */
    function calculateLevel(uint256 _xp) public pure returns (uint256) {
        if (_xp == 0) return 1;
        // Using a simple square root function for progression
        return (_sqrt(_xp) / 10) + 1;
    }

    /**
     * @notice A simple integer square root function.
     */
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
