// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DonationTrail} from "../src/DonationTrail.sol";

/// Usage: VERIFIER_ADDRESS=0x... forge script script/Deploy.s.sol --rpc-url <url> --broadcast --private-key <key>
contract Deploy is Script {
    function run() external returns (DonationTrail trail) {
        address verifier = vm.envAddress("VERIFIER_ADDRESS");
        vm.startBroadcast();
        trail = new DonationTrail(verifier);
        vm.stopBroadcast();
        console.log("DonationTrail deployed at", address(trail));
        console.log("Verifier", verifier);
    }
}
