// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

// --- Interfaces ---

import "src/interfaces/IArcProfile.sol";

/**
 * @title ArcStream Protocol
 * @dev A protocol for creating and managing real-time payment streams of native USDC or ERC-20 tokens.
 * This contract allows a Payer to deposit funds that flow to a Recipient over a specified duration.
 */
contract ArcStream is Ownable {
    // --- Events ---

    event CreateStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 duration
    );

    event WithdrawFromStream(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );

    event CancelStream(
        uint256 indexed streamId,
        address sender,
        address recipient,
        uint256 senderAmount,
        uint256 recipientAmount
    );
    
    event ArcProfileAddressSet(address indexed arcProfileAddress);

    // --- Structs ---

    struct Stream {
        address sender;
        address recipient;
        uint256 deposit;
        address tokenAddress; // address(0) for native USDC, otherwise ERC-20
        uint256 startTime;
        uint256 duration;
        uint256 remainingBalance;
        uint256 ratePerSecond;
    }

    // --- State Variables ---

    uint256 public nextStreamId;
    mapping(uint256 => Stream) public streams;
    address public arcProfile;

    // --- Errors ---

    error InvalidStreamId(uint256 streamId);
    error ZeroValue();
    error ZeroDuration();
    error NothingToWithdraw();
    error NotAuthorized();
    error NativeValueMismatch();
    error Erc20ValueSent();

    // --- Constructor ---
    
    constructor() Ownable(msg.sender) {}

    // --- Functions ---

    /**
     * @notice Sets the address of the ArcProfile contract.
     * @param _arcProfileAddress The address of the ArcProfile contract.
     */
    function setArcProfileAddress(address _arcProfileAddress) external onlyOwner {
        arcProfile = _arcProfileAddress;
        emit ArcProfileAddressSet(_arcProfileAddress);
    }

    /**
     * @notice Creates a new payment stream.
     * @param recipient The address that will receive the streamed funds.
     * @param amount The total amount to be streamed.
     * @param duration The total duration of the stream in seconds.
     * @param tokenAddress The address of the ERC-20 token, or address(0) for native USDC.
     */
    function createStream(
        address recipient,
        uint256 amount,
        uint256 duration,
        address tokenAddress
    )
        external
        payable
    {
        if (amount == 0) revert ZeroValue();
        if (duration == 0) revert ZeroDuration();

        if (tokenAddress == address(0)) {
            // Native USDC transfer
            if (msg.value != amount) revert NativeValueMismatch();
        } else {
            // ERC-20 token transfer
            if (msg.value > 0) revert Erc20ValueSent();
            IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        }

        uint256 streamId = nextStreamId;
        uint256 rate = amount / duration;

        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            deposit: amount,
            tokenAddress: tokenAddress,
            startTime: block.timestamp,
            duration: duration,
            remainingBalance: amount,
            ratePerSecond: rate
        });

        nextStreamId++;

        emit CreateStream(streamId, msg.sender, recipient, amount, tokenAddress, duration);

        // --- Gamification Hook ---
        if (arcProfile != address(0)) {
            try IArcProfile(arcProfile).addXP(msg.sender, 10, 0) { // 10 XP, Badge 0 (Streamer)
                // Success, do nothing
            } catch {
                // Failure is silent, do not revert the main transaction
            }
        }
    }

    /**
     * @notice Calculates the currently claimable amount for a stream.
     * @param _streamId The ID of the stream.
     * @return The amount of tokens the recipient can withdraw at this moment.
     */
    function balanceOf(uint256 _streamId) public view returns (uint256) {
        Stream storage stream = streams[_streamId];
        if (stream.sender == address(0)) return 0; // Stream doesn't exist

        uint256 elapsedTime = block.timestamp - stream.startTime;
        if (elapsedTime >= stream.duration) {
            return stream.remainingBalance; // The rest of the stream is claimable
        }

        uint256 earnedAmount = elapsedTime * stream.ratePerSecond;
        uint256 amountAlreadyWithdrawn = stream.deposit - stream.remainingBalance;
        
        return earnedAmount - amountAlreadyWithdrawn;
    }

    /**
     * @notice Withdraws the claimable amount from a stream to the recipient.
     * @param _streamId The ID of the stream to withdraw from.
     * @dev Anyone can call this, but the funds will always go to the stream's recipient.
     */
    function withdrawFromStream(uint256 _streamId) public {
        Stream storage stream = streams[_streamId];
        if (stream.sender == address(0)) revert InvalidStreamId(_streamId);

        uint256 claimableAmount = balanceOf(_streamId);
        if (claimableAmount == 0) revert NothingToWithdraw();

        // --- Checks-Effects-Interactions Pattern ---
        // Effects
        stream.remainingBalance -= claimableAmount;

        // Interactions
        if (stream.tokenAddress == address(0)) {
            (bool success, ) = stream.recipient.call{value: claimableAmount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(stream.tokenAddress).transfer(stream.recipient, claimableAmount);
        }

        emit WithdrawFromStream(_streamId, stream.recipient, claimableAmount);
    }

    /**
     * @notice Cancels a stream and distributes the remaining funds.
     * @param _streamId The ID of the stream to cancel.
     * @dev The unlocked (earned) portion goes to the recipient, and the locked (future) portion is refunded to the sender.
     *      Can only be called by the sender or recipient.
     */
    function cancelStream(uint256 _streamId) public {
        Stream storage stream = streams[_streamId];
        if (stream.sender == address(0)) revert InvalidStreamId(_streamId);

        if (msg.sender != stream.sender && msg.sender != stream.recipient) {
            revert NotAuthorized();
        }

        uint256 recipientAmount = balanceOf(_streamId);
        uint256 senderAmount = stream.remainingBalance - recipientAmount;

        // Copy values before deleting
        address streamSender = stream.sender;
        address streamRecipient = stream.recipient;
        address tokenAddress = stream.tokenAddress;

        // --- Checks-Effects-Interactions Pattern ---
        // Effect: Invalidate the stream by deleting it
        delete streams[_streamId];

        // Interactions
        if (tokenAddress == address(0)) {
            if (recipientAmount > 0) {
                (bool success, ) = streamRecipient.call{value: recipientAmount}("");
                require(success, "Recipient transfer failed");
            }
            if (senderAmount > 0) {
                (bool success, ) = streamSender.call{value: senderAmount}("");
                require(success, "Sender refund failed");
            }
        } else {
            if (recipientAmount > 0) {
                IERC20(tokenAddress).transfer(streamRecipient, recipientAmount);
            }
            if (senderAmount > 0) {
                IERC20(tokenAddress).transfer(streamSender, senderAmount);
            }
        }

        emit CancelStream(_streamId, streamSender, streamRecipient, senderAmount, recipientAmount);
    }
}
