// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "src/ArcStream.sol";

contract ArcStreamTest is Test {
    ArcStream arcStream;
    address sender = address(1);
    address recipient = address(2);
    uint256 depositAmount = 1000 ether;
    uint256 duration = 1000; // seconds

    function setUp() public {
        arcStream = new ArcStream();
    }

    // --- Test Create Stream ---

    function test_CreateStream_Success() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        (
            address streamSender,
            address streamRecipient,
            uint256 deposit,
            , // startTime is non-deterministic
            uint256 streamDuration,
            uint256 remainingBalance,
            uint256 ratePerSecond
        ) = arcStream.streams(0);

        assertEq(streamSender, sender);
        assertEq(streamRecipient, recipient);
        assertEq(deposit, depositAmount);
        assertEq(streamDuration, duration);
        assertEq(remainingBalance, depositAmount);
        assertEq(ratePerSecond, depositAmount / duration);
    }

    function test_Fail_CreateStream_ZeroDeposit() public {
        vm.prank(sender);
        vm.expectRevert(ArcStream.ZeroValue.selector);
        arcStream.createStream(recipient, duration);
    }

    function test_Fail_CreateStream_ZeroDuration() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        vm.expectRevert(ArcStream.ZeroDuration.selector);
        arcStream.createStream{value: depositAmount}(recipient, 0);
    }

    // --- Test Withdraw ---

    function test_Withdraw_Success() public {
        // 1. Create stream
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        // 2. Advance time by half the duration
        uint256 timeToSkip = duration / 2;
        vm.warp(block.timestamp + timeToSkip);

        // 3. Check balance
        uint256 expectedBalance = arcStream.balanceOf(0);
        assertEq(expectedBalance, timeToSkip * (depositAmount / duration));

        // 4. Withdraw
        uint256 recipientInitialBalance = recipient.balance;
        vm.prank(recipient); // Anyone can call, but let's test with recipient
        arcStream.withdrawFromStream(0);
        
        // 5. Verify balances
        assertEq(recipient.balance, recipientInitialBalance + expectedBalance);
        (, , , , , uint256 remainingBalance, ) = arcStream.streams(0);
        assertEq(remainingBalance, depositAmount - expectedBalance);
    }

    function test_Withdraw_FullStream() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        vm.warp(block.timestamp + duration + 1); // End of stream

        uint256 recipientInitialBalance = recipient.balance;
        arcStream.withdrawFromStream(0);

        assertEq(recipient.balance, recipientInitialBalance + depositAmount);
        (, , , , , uint256 remainingBalance, ) = arcStream.streams(0);
        assertEq(remainingBalance, 0);
    }

    function test_Fail_Withdraw_NothingToWithdraw() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        // No time has passed
        vm.expectRevert(ArcStream.NothingToWithdraw.selector);
        arcStream.withdrawFromStream(0);
    }

    // --- Test Cancel Stream ---

    function test_CancelStream_BySender() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        uint256 timeToSkip = duration / 4;
        vm.warp(block.timestamp + timeToSkip);

        uint256 recipientAmount = arcStream.balanceOf(0);
        (, , , , , uint256 remainingBalance, ) = arcStream.streams(0);
        uint256 senderAmount = remainingBalance - recipientAmount;

        uint256 senderInitialBalance = sender.balance;
        uint256 recipientInitialBalance = recipient.balance;

        vm.prank(sender);
        arcStream.cancelStream(0);

        assertEq(sender.balance, senderInitialBalance + senderAmount);
        assertEq(recipient.balance, recipientInitialBalance + recipientAmount);

        // Stream should be deleted
        (address streamSender, , , , , , ) = arcStream.streams(0);
        assertEq(streamSender, address(0));
    }

    function test_CancelStream_ByRecipient() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        uint256 timeToSkip = duration / 2;
        vm.warp(block.timestamp + timeToSkip);

        uint256 recipientAmount = arcStream.balanceOf(0);
        (, , , , , uint256 remainingBalance, ) = arcStream.streams(0);
        uint256 senderAmount = remainingBalance - recipientAmount;

        uint256 senderInitialBalance = sender.balance;
        uint256 recipientInitialBalance = recipient.balance;

        vm.prank(recipient);
        arcStream.cancelStream(0);

        assertEq(sender.balance, senderInitialBalance + senderAmount);
        assertEq(recipient.balance, recipientInitialBalance + recipientAmount);
    }

    function test_Fail_CancelStream_NotAuthorized() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        address unauthorized = address(3);
        vm.prank(unauthorized);
        vm.expectRevert(ArcStream.NotAuthorized.selector);
        arcStream.cancelStream(0);
    }

    // --- Test Balance Of ---

    function test_BalanceOf_Correctness() public {
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, duration);

        // Time = 0
        assertEq(arcStream.balanceOf(0), 0);

        // Time = 1/4
        vm.warp(block.timestamp + duration / 4);
        assertEq(arcStream.balanceOf(0), (duration / 4) * (depositAmount / duration));

        // Time = 1/2
        vm.warp(block.timestamp + duration / 4); // another 1/4
        assertEq(arcStream.balanceOf(0), (duration / 2) * (depositAmount / duration));

        // Withdraw and check again
        arcStream.withdrawFromStream(0);
        assertEq(arcStream.balanceOf(0), 0);

        // Advance time again
        vm.warp(block.timestamp + duration / 4);
        assertEq(arcStream.balanceOf(0), (duration / 4) * (depositAmount / duration));
    }
}
