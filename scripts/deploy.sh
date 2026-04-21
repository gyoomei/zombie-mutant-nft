#!/bin/bash
# Deploy ZombieMutantNFT to Base Sepolia (testnet)
# Usage: bash scripts/deploy.sh

export PATH="$HOME/.foundry/bin:$PATH"
cd "$(dirname "$0")/.."

# Deployer wallet
DEPLOYER_KEY="0xd0c2d129d538a1be04351a1a897e4e2ebcb1e630145e86f10ba0c7ac540085c1"
DEPLOYER_ADDR="0x5904f21F14215B1b291923CC89764Bf9165E8798"

echo "=== Zombie Mutant NFT Deployment ==="
echo "Deployer: $DEPLOYER_ADDR"
echo ""

# Check balance on Base Sepolia
echo "Checking balance on Base Sepolia..."
BALANCE=$(cast balance $DEPLOYER_ADDR --rpc-url https://sepolia.base.org 2>&1)
echo "Balance: $BALANCE"

if [[ "$BALANCE" == "0" ]]; then
    echo ""
    echo "⚠️  No ETH on Base Sepolia!"
    echo "Fund this address: $DEPLOYER_ADDR"
    echo "Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
    echo ""
    echo "After funding, run this script again."
    exit 1
fi

echo ""
echo "Deploying contract..."

# Deploy
forge create src/ZombieMutantNFT.sol:ZombieMutantNFT \
    --rpc-url https://sepolia.base.org \
    --private-key $DEPLOYER_KEY \
    --broadcast \
    2>&1

echo ""
echo "=== Deployment Complete ==="
echo "Update CONTRACT_ADDRESS in src/app.js with the deployed address"
