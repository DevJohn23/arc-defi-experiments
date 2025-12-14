// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/interfaces/IERC20.sol";

/**
 * @title ArcLink
 * @dev This contract allows users to send crypto via a secret link.
 * The sender deposits funds with a hash of a secret, and the receiver
 * can claim the funds by providing the original secret.
 */
contract ArcLink {
    // --- Structs ---

    /**
     * @dev Represents a deposit linked to a secret.
     * @param sender The address of the user who created the link.
     * @param token The address of the token being sent (address(0) for native currency).
     * @param amount The amount of tokens deposited.
     * @param claimed A flag indicating whether the funds have been claimed.
     */
    struct Link {
        address sender;
        address token;
        uint256 amount;
        bool claimed;
    }

    // --- State Variables ---

    /**
     * @dev Mapping from the keccak256 hash of a secret to the corresponding Link.
     */
    mapping(bytes32 => Link) public links;

    // --- Events ---

    event LinkCreated(bytes32 indexed secretHash, address indexed sender, uint256 amount, address token);
    event LinkClaimed(bytes32 indexed secretHash, address indexed recipient, uint256 amount, address token);
    event LinkRefunded(bytes32 indexed secretHash, address indexed sender, uint256 amount, address token);

    // --- Errors ---

    error LinkAlreadyExists();
    error LinkNotFound();
    error LinkAlreadyClaimed();
    error InvalidSecret();
    error NotSender();
    error NativeValueMismatch();
    error Erc20ValueSent();

    // --- Functions ---

    /**
     * @notice Creates a new link by depositing funds.
     * @param secretHash The keccak256 hash of the secret string.
     * @param token The address of the ERC-20 token, or address(0) for native currency.
     * @param amount The amount to deposit.
     */
    function createLink(bytes32 secretHash, address token, uint256 amount) external payable {
        if (links[secretHash].sender != address(0)) {
            revert LinkAlreadyExists();
        }

        if (token == address(0)) {
            if (msg.value != amount) {
                revert NativeValueMismatch();
            }
        } else {
            if (msg.value > 0) {
                revert Erc20ValueSent();
            }
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        links[secretHash] = Link({
            sender: msg.sender,
            token: token,
            amount: amount,
            claimed: false
        });

        emit LinkCreated(secretHash, msg.sender, amount, token);
    }

    /**
     * @notice Claims the funds from a link.
     * @param secret The secret string used to create the link.
     * @param recipient The address to receive the funds.
     */
    function claimLink(string memory secret, address recipient) external {
        if (bytes(secret).length == 0) {
            revert InvalidSecret();
        }
        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        Link storage link = links[secretHash];

        if (link.sender == address(0)) {
            revert LinkNotFound();
        }
        if (link.claimed) {
            revert LinkAlreadyClaimed();
        }

        // Checks-Effects-Interactions pattern to prevent reentrancy
        link.claimed = true;

        uint256 amount = link.amount;
        address token = link.token;

        if (token == address(0)) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(token).transfer(recipient, amount);
        }

        emit LinkClaimed(secretHash, recipient, amount, token);
    }

    /**
     * @notice Refunds the deposited amount to the sender if the link has not been claimed.
     * @param secretHash The hash of the secret used to create the link.
     */
    function refundLink(bytes32 secretHash) external {
        Link storage link = links[secretHash];

        if (link.sender == address(0)) {
            revert LinkNotFound();
        }
        if (link.sender != msg.sender) {
            revert NotSender();
        }
        if (link.claimed) {
            revert LinkAlreadyClaimed();
        }

        // Checks-Effects-Interactions pattern
        link.claimed = true;

        uint256 amount = link.amount;
        address token = link.token;

        if (token == address(0)) {
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Native refund failed");
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }

        emit LinkRefunded(secretHash, msg.sender, amount, token);
    }
}
