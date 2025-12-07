// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/console.sol";

/**
 * @title ArcStream Protocol
 * @dev A protocol for creating and managing real-time payment streams of native USDC.
 * This contract allows a Payer to deposit funds that flow to a Recipient over a specified duration.
 */
contract ArcStream {
    // --- Events ---

    event CreateStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
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

    // --- Structs ---

    struct Stream {
        address sender;
        address recipient;
        uint256 deposit;
        uint256 startTime;
        uint256 duration;
        uint256 remainingBalance;
        uint256 ratePerSecond;
    }

    // --- State Variables ---

    uint256 public nextStreamId;
    mapping(uint256 => Stream) public streams;

    // --- Errors ---

    error InvalidStreamId(uint256 streamId);
    error ZeroValue();
    error ZeroDuration();
    error NothingToWithdraw();
    error NotAuthorized();

    // --- Functions ---

    /**
     * @notice Creates a new payment stream.
     * @param _recipient The address that will receive the streamed funds.
     * @param _duration The total duration of the stream in seconds.
     * @dev The amount sent with the transaction (`msg.value`) is the total deposit for the stream.
     */
    function createStream(address _recipient, uint256 _duration) public payable {
        if (msg.value == 0) revert ZeroValue();
        if (_duration == 0) revert ZeroDuration();

        uint256 streamId = nextStreamId;
        uint256 rate = msg.value / _duration;

        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: _recipient,
            deposit: msg.value,
            startTime: block.timestamp,
            duration: _duration,
            remainingBalance: msg.value,
            ratePerSecond: rate
        });

        nextStreamId++;

        emit CreateStream(streamId, msg.sender, _recipient, msg.value, _duration);
    }

    /**
     * @notice Calculates the currently claimable amount for a stream.
     * @param _streamId The ID of the stream.
     * @return The amount of USDC the recipient can withdraw at this moment.
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
        (bool success, ) = stream.recipient.call{value: claimableAmount}("");
        require(success, "USDC transfer failed");

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

        // --- Checks-Effects-Interactions Pattern ---
        // Effect: Invalidate the stream by deleting it
        delete streams[_streamId];

        // Interactions
        if (recipientAmount > 0) {
            (bool success, ) = streamRecipient.call{value: recipientAmount}("");
            require(success, "Recipient transfer failed");
        }
        if (senderAmount > 0) {
            (bool success, ) = streamSender.call{value: senderAmount}("");
            require(success, "Sender refund failed");
        }

        emit CancelStream(_streamId, streamSender, streamRecipient, senderAmount, recipientAmount);
    }
}
