# ERC20-contract
ERC20 contract, mint at least 100 tokens using Hardhat,

# Initialize a Hardhat project:
Create a new directory for your project and run the following commands to set up a new Hardhat project:

npx hardhat init

# Write the ERC20 Contract:
Create a new Solidity contract file, e.g., MyToken.sol, and add the following code to define your ERC20 contract:

<// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {}

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }
}

Make sure to install the OpenZeppelin library with:

npm install @openzeppelin/contracts

# Compile the Contract:
Run the following command to compile your Solidity contracts:

npx hardhat compile

# Write a Deployment Script:
Create a deployment script, e.g., deploy.js, in the scripts directory:

const { ethers } = require("hardhat");

async function main() {
    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy();

    await myToken.deployed();

    console.log("MyToken deployed to:", myToken.address);

    // Mint tokens
    const [owner] = await ethers.getSigners();
    const amountToMint = ethers.utils.parseEther("100"); // Mint 100 tokens
    await myToken.connect(owner).mint(owner.address, amountToMint);

    console.log(`Minted ${ethers.utils.formatEther(amountToMint)} MTK to owner`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

# Deploy the Contract and Mint Tokens:
Run the deployment script using the following command:

npx hardhat run scripts/deploy.js --network <network_name>

Replace <network_name> with the network you want to deploy to (e.g., "rinkeby" for the Rinkeby testnet or "localhost" for a local network).

# Verify the Contract on Etherscan (optional):
If you're deploying to a public Ethereum network, you can verify your contract on Etherscan for transparency.
Note: Ensure you have your Hardhat network settings and wallet configured properly before deploying to a public network. You'll need the appropriate etherscan API key to verify the contract.

# Additionally: 
remember to keep your private keys and sensitive information secure when deploying contracts on the Ethereum network.
