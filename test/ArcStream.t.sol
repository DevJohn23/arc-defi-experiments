// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "src/ArcStream.sol";
import "src/mocks/MockERC20.sol";

contract ArcStreamTest is Test {
    // Contracts
    ArcStream arcStream;
    MockERC20 mockToken;

    // Test Users
    address sender = address(1);
    address recipient = address(2);

    // Stream Parameters
    uint256 depositAmount = 1000 ether;
    uint256 duration = 1000; // seconds

    function setUp() public {
        arcStream = new ArcStream();
        mockToken = new MockERC20("Mock Token", "MTKN", 18);

        // Fund sender for both native and ERC-20 tests
        vm.deal(sender, depositAmount * 2); // For native tests + gas
        mockToken.mint(sender, depositAmount);
    }

    // --- Test Create Stream (Native USDC) ---

    function test_CreateStream_Native_Success() public {
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(
            recipient,
            depositAmount,
            duration,
            address(0)
        );

        (
            address streamSender,
            address streamRecipient,
            uint256 deposit,
            address tokenAddress,
            , // startTime
            uint256 streamDuration,
            uint256 remainingBalance,
            uint256 ratePerSecond
        ) = arcStream.streams(0);

        assertEq(streamSender, sender);
        assertEq(streamRecipient, recipient);
        assertEq(deposit, depositAmount);
        assertEq(tokenAddress, address(0));
        assertEq(streamDuration, duration);
        assertEq(remainingBalance, depositAmount);
        assertEq(ratePerSecond, depositAmount / duration);
    }

    function test_Fail_CreateStream_Native_ZeroDeposit() public {
        vm.prank(sender);
        vm.expectRevert(ArcStream.ZeroValue.selector);
        arcStream.createStream(recipient, 0, duration, address(0));
    }

    function test_Fail_CreateStream_Native_ZeroDuration() public {
        vm.prank(sender);
        vm.expectRevert(ArcStream.ZeroDuration.selector);
        arcStream.createStream{value: depositAmount}(
            recipient,
            depositAmount,
            0,
            address(0)
        );
    }

    function test_Fail_CreateStream_Native_ValueMismatch() public {
        vm.prank(sender);
        vm.expectRevert(ArcStream.NativeValueMismatch.selector);
        arcStream.createStream{value: depositAmount - 1}(
            recipient,
            depositAmount,
            duration,
            address(0)
        );
    }

    // --- Test Create Stream (ERC-20) ---

    function test_CreateStream_ERC20_Success() public {
        // 1. Approve contract to spend tokens
        vm.prank(sender);
        mockToken.approve(address(arcStream), depositAmount);

        // 2. Create stream
        vm.prank(sender);
        arcStream.createStream(
            recipient,
            depositAmount,
            duration,
            address(mockToken)
        );

        // 3. Verify stream data
        (
            , // sender
            , // recipient
            uint256 deposit,
            address tokenAddress,
            , // startTime
            , // duration
            uint256 remainingBalance,
            uint256 ratePerSecond
        ) = arcStream.streams(0);

        assertEq(deposit, depositAmount);
        assertEq(tokenAddress, address(mockToken));
        assertEq(remainingBalance, depositAmount);
        assertEq(ratePerSecond, depositAmount / duration);

        // 4. Verify token transfer
        assertEq(mockToken.balanceOf(sender), 0);
        assertEq(mockToken.balanceOf(address(arcStream)), depositAmount);
    }

    function test_Fail_CreateStream_ERC20_ValueSent() public {
        vm.prank(sender);
        mockToken.approve(address(arcStream), depositAmount);

        vm.expectRevert(ArcStream.Erc20ValueSent.selector);
        arcStream.createStream{value: 1 ether}(
            recipient,
            depositAmount,
            duration,
            address(mockToken)
        );
    }

    // --- Test Withdraw (Native) ---

    function test_Withdraw_Native_Success() public {
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, depositAmount, duration, address(0));

        uint256 timeToSkip = duration / 2;
        vm.warp(block.timestamp + timeToSkip);

        uint256 expectedBalance = arcStream.balanceOf(0);
        uint256 recipientInitialBalance = recipient.balance;
        
        arcStream.withdrawFromStream(0);
        
        assertEq(recipient.balance, recipientInitialBalance + expectedBalance);
    }

    // --- Test Withdraw (ERC-20) ---

    function test_Withdraw_ERC20_Success() public {
        vm.prank(sender);
        mockToken.approve(address(arcStream), depositAmount);
        vm.prank(sender);
        arcStream.createStream(recipient, depositAmount, duration, address(mockToken));

        uint256 timeToSkip = duration / 2;
        vm.warp(block.timestamp + timeToSkip);

        uint256 expectedBalance = arcStream.balanceOf(0);
        uint256 recipientInitialBalance = mockToken.balanceOf(recipient);

        vm.prank(sender); // Allow anyone to call withdraw
        arcStream.withdrawFromStream(0);

        assertEq(mockToken.balanceOf(recipient), recipientInitialBalance + expectedBalance);
    }

    // --- Test Cancel Stream (Native) ---

    function test_CancelStream_Native_BySender() public {
        vm.prank(sender);
        arcStream.createStream{value: depositAmount}(recipient, depositAmount, duration, address(0));

        vm.warp(block.timestamp + duration / 4);

        uint256 recipientAmount = arcStream.balanceOf(0);
        (, , , , , , uint256 remainingBalance, ) = arcStream.streams(0);
        uint256 senderAmount = remainingBalance - recipientAmount;

        uint256 senderInitialBalance = sender.balance;
        uint256 recipientInitialBalance = recipient.balance;

        vm.prank(sender);
        arcStream.cancelStream(0);

        assertEq(sender.balance, senderInitialBalance + senderAmount);
        assertEq(recipient.balance, recipientInitialBalance + recipientAmount);
    }
    
    // --- Test Cancel Stream (ERC-20) ---

    function test_CancelStream_ERC20_BySender() public {
        vm.prank(sender);
        mockToken.approve(address(arcStream), depositAmount);
        vm.prank(sender);
        arcStream.createStream(recipient, depositAmount, duration, address(mockToken));
        
        vm.warp(block.timestamp + duration / 4);
        
        uint256 recipientAmount = arcStream.balanceOf(0);
        
        (
            address streamSender,
            address streamRecipient,
            uint256 deposit,
            address tokenAddress,
            uint256 startTime,
            uint256 streamDuration,
            uint256 remainingBalance,
            uint256 ratePerSecond
        ) = arcStream.streams(0);

        ArcStream.Stream memory stream = ArcStream.Stream({
            sender: streamSender,
            recipient: streamRecipient,
            deposit: deposit,
            tokenAddress: tokenAddress,
            startTime: startTime,
            duration: streamDuration,
            remainingBalance: remainingBalance,
            ratePerSecond: ratePerSecond
        });

        uint256 senderAmount = stream.remainingBalance - recipientAmount;

        uint256 senderInitialBalance = mockToken.balanceOf(sender);
        uint256 recipientInitialBalance = mockToken.balanceOf(recipient);

        vm.prank(sender);
        arcStream.cancelStream(0);

        assertEq(mockToken.balanceOf(sender), senderInitialBalance + senderAmount);
        assertEq(mockToken.balanceOf(recipient), recipientInitialBalance + recipientAmount);
        
        // Stream should be deleted
        (address deletedStreamSender, , , , , , , ) = arcStream.streams(0);
        assertEq(deletedStreamSender, address(0));
    }
}
