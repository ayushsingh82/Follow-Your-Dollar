// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DonationTrail} from "../src/DonationTrail.sol";

contract RejectsEth {
    receive() external payable {
        revert("no thanks");
    }
}

contract DonationTrailTest is Test {
    DonationTrail trail;

    address verifier = makeAddr("verifier");
    address ngo = makeAddr("ngo");
    address donor = makeAddr("donor");
    address fieldOffice = makeAddr("fieldOffice");

    uint256 campaignId;

    function setUp() public {
        trail = new DonationTrail(verifier);
        vm.deal(donor, 10 ether);
        vm.prank(ngo);
        campaignId = trail.createCampaign("Flood relief");
    }

    function _donate(uint256 amount) internal {
        vm.prank(donor);
        trail.donate{value: amount}(campaignId);
    }

    function _hopTo(address to, uint256 amount, uint256 declaredCents) internal returns (uint256) {
        vm.prank(ngo);
        return trail.recordHop(campaignId, to, amount, declaredCents, keccak256("receipt"), "Field office");
    }

    function _hop(uint256 amount, uint256 declaredCents) internal returns (uint256) {
        return _hopTo(fieldOffice, amount, declaredCents);
    }

    function _status(uint256 hopId) internal view returns (DonationTrail.HopStatus status) {
        (,,,,,,, status,) = trail.hops(hopId);
    }

    function _balance() internal view returns (uint256 balance) {
        (,, balance,,) = trail.campaigns(campaignId);
    }

    // --- campaigns and donations

    function test_donateIncreasesBalance() public {
        _donate(1 ether);
        (,, uint256 balance, uint256 raised,) = trail.campaigns(campaignId);
        assertEq(balance, 1 ether);
        assertEq(raised, 1 ether);
    }

    function test_donateZeroReverts() public {
        vm.prank(donor);
        vm.expectRevert(DonationTrail.ZeroAmount.selector);
        trail.donate{value: 0}(campaignId);
    }

    function test_donateUnknownCampaignReverts() public {
        vm.prank(donor);
        vm.expectRevert(DonationTrail.UnknownCampaign.selector);
        trail.donate{value: 1}(999);
    }

    // --- escrow on record

    function test_recordHopHoldsFundsInEscrow() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);

        assertEq(fieldOffice.balance, 0, "recipient must not be paid yet");
        assertEq(address(trail).balance, 1 ether, "contract still holds everything");
        assertEq(_balance(), 0.6 ether, "uncommitted balance reduced");
        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Pending));
        assertEq(trail.getCampaignHops(campaignId).length, 1);
    }

    function test_onlyNgoCanRecordHop() public {
        _donate(1 ether);
        vm.prank(donor);
        vm.expectRevert(DonationTrail.NotNgo.selector);
        trail.recordHop(campaignId, fieldOffice, 1, 1, bytes32(0), "x");
    }

    function test_recordHopOverBalanceReverts() public {
        _donate(1 ether);
        vm.prank(ngo);
        vm.expectRevert(DonationTrail.InsufficientCampaignBalance.selector);
        trail.recordHop(campaignId, fieldOffice, 2 ether, 1, bytes32(0), "x");
    }

    // --- check: match releases, mismatch holds

    function test_matchingReceiptReleasesFunds() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 5_000);

        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Verified));
        assertEq(fieldOffice.balance, 0.4 ether);
        assertEq(address(trail).balance, 0.6 ether);
    }

    function test_withinToleranceReleasesFunds() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 10_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 10_100); // exactly 1%
        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Verified));
        assertEq(fieldOffice.balance, 0.4 ether);
    }

    function test_justOutsideToleranceIsFlagged() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 10_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 10_101);
        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Flagged));
    }

    function test_mismatchIsFlaggedAndFundsStayHeld() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 3_000);

        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Flagged));
        assertEq(fieldOffice.balance, 0, "flagged funds must not be released");
        assertEq(address(trail).balance, 1 ether);
    }

    function test_failedPayoutFlagsInsteadOfBlocking() public {
        _donate(1 ether);
        address bad = address(new RejectsEth());
        uint256 hopId = _hopTo(bad, 0.4 ether, 5_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 5_000); // matches, but the payout fails

        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Flagged));
        assertEq(address(trail).balance, 1 ether);
    }

    function test_onlyVerifierCanCheck() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.prank(ngo);
        vm.expectRevert(DonationTrail.NotVerifier.selector);
        trail.checkHop(hopId, 5_000);
    }

    function test_cannotCheckTwice() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.startPrank(verifier);
        trail.checkHop(hopId, 5_000);
        vm.expectRevert(DonationTrail.AlreadyChecked.selector);
        trail.checkHop(hopId, 5_000);
        vm.stopPrank();
    }

    function test_checkUnknownHopReverts() public {
        vm.prank(verifier);
        vm.expectRevert(DonationTrail.UnknownHop.selector);
        trail.checkHop(42, 1);
    }

    // --- review of flagged hops

    function _flagged() internal returns (uint256 hopId) {
        _donate(1 ether);
        hopId = _hop(0.4 ether, 5_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 3_000);
    }

    function test_reviewerApprovalReleasesFunds() public {
        uint256 hopId = _flagged();
        vm.prank(verifier);
        trail.reviewHop(hopId, true);

        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Approved));
        assertEq(fieldOffice.balance, 0.4 ether);
    }

    function test_reviewerRejectionReturnsFundsToCampaign() public {
        uint256 hopId = _flagged();
        vm.prank(verifier);
        trail.reviewHop(hopId, false);

        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Rejected));
        assertEq(fieldOffice.balance, 0);
        assertEq(_balance(), 1 ether, "returned to the campaign balance");
    }

    function test_onlyVerifierCanReview() public {
        uint256 hopId = _flagged();
        vm.prank(ngo);
        vm.expectRevert(DonationTrail.NotVerifier.selector);
        trail.reviewHop(hopId, true);
    }

    function test_cannotReviewNonFlaggedHop() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.prank(verifier);
        vm.expectRevert(DonationTrail.NotFlagged.selector);
        trail.reviewHop(hopId, true); // still pending
    }

    function test_approvingToARejectingRecipientReverts() public {
        _donate(1 ether);
        address bad = address(new RejectsEth());
        uint256 hopId = _hopTo(bad, 0.4 ether, 5_000);
        vm.startPrank(verifier);
        trail.checkHop(hopId, 5_000); // flagged by failed payout
        vm.expectRevert(DonationTrail.TransferFailed.selector);
        trail.reviewHop(hopId, true);
        trail.reviewHop(hopId, false); // reviewer can still return the funds
        vm.stopPrank();
        assertEq(_balance(), 1 ether);
    }

    // --- reclaim after timeout

    function test_ngoCanReclaimPendingHopAfterTimeout() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.warp(block.timestamp + 7 days);
        vm.prank(ngo);
        trail.reclaim(hopId);

        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Rejected));
        assertEq(_balance(), 1 ether);
    }

    function test_ngoCanReclaimFlaggedHopAfterTimeout() public {
        uint256 hopId = _flagged();
        vm.warp(block.timestamp + 7 days);
        vm.prank(ngo);
        trail.reclaim(hopId);
        assertEq(uint8(_status(hopId)), uint8(DonationTrail.HopStatus.Rejected));
    }

    function test_reclaimTooEarlyReverts() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.warp(block.timestamp + 7 days - 1);
        vm.prank(ngo);
        vm.expectRevert(DonationTrail.TooEarly.selector);
        trail.reclaim(hopId);
    }

    function test_onlyNgoCanReclaim() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.warp(block.timestamp + 7 days);
        vm.prank(donor);
        vm.expectRevert(DonationTrail.NotNgo.selector);
        trail.reclaim(hopId);
    }

    function test_cannotReclaimVerifiedHop() public {
        _donate(1 ether);
        uint256 hopId = _hop(0.4 ether, 5_000);
        vm.prank(verifier);
        trail.checkHop(hopId, 5_000);
        vm.warp(block.timestamp + 7 days);
        vm.prank(ngo);
        vm.expectRevert(DonationTrail.NotReclaimable.selector);
        trail.reclaim(hopId);
    }

    // --- accounting invariant

    function test_contractBalanceEqualsUncommittedPlusHeldFunds() public {
        _donate(1 ether);
        uint256 a = _hop(0.3 ether, 1_000);
        _hop(0.2 ether, 1_000);
        vm.prank(verifier);
        trail.checkHop(a, 1_000); // released: 0.3 leaves the contract
        // contract: 1 - 0.3 = 0.7 = uncommitted 0.5 + held 0.2
        assertEq(address(trail).balance, 0.7 ether);
        assertEq(_balance(), 0.5 ether);
    }
}
