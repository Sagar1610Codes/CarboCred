/**
 * config/blockchain.js — Ethers.js singleton provider + contract instance.
 * RULES: Singleton pattern. Retry on failure. Structured logging.
 */

import { ethers } from 'ethers';

import { env } from './env.js';
import logger from '../utils/logger.js';

// ABI subset — only the events and functions we need
const CONTRACT_ABI = [
    // ERC-1155 style Carbon Credit events
    'event CreditIssued(address indexed to, uint256 indexed projectId, uint256 amount, bytes32 txRef)',
    'event CreditTransferred(address indexed from, address indexed to, uint256 indexed projectId, uint256 amount)',
    'event CreditRetired(address indexed by, uint256 indexed projectId, uint256 amount, string reason)',

    // Read functions
    'function balanceOf(address account, uint256 projectId) view returns (uint256)',
    'function totalSupply(uint256 projectId) view returns (uint256)',
    'function isRetired(uint256 projectId, uint256 amount) view returns (bool)',

    // Write functions (called by admin/verifier)
    'function issueCredits(address to, uint256 projectId, uint256 amount, bytes32 txRef) returns (bool)',
    'function transferCredits(address to, uint256 projectId, uint256 amount) returns (bool)',
    'function retireCredits(uint256 projectId, uint256 amount, string reason) returns (bool)',
];

let _provider = null;
let _signer = null;
let _contract = null;

/**
 * Initialise (or return cached) provider, signer, and contract instances.
 * RULES: Singleton — only one provider per process.
 */
export const getBlockchainInstances = () => {
    if (_provider && _signer && _contract) {
        return { provider: _provider, signer: _signer, contract: _contract };
    }

    try {
        _provider = new ethers.JsonRpcProvider(env.RPC_URL);
        _signer = new ethers.Wallet(env.PRIVATE_KEY, _provider);
        _contract = new ethers.Contract(env.CONTRACT_ADDRESS, CONTRACT_ABI, _signer);

        logger.info('✅ Blockchain provider initialised');
        return { provider: _provider, signer: _signer, contract: _contract };
    } catch (error) {
        logger.error(`Failed to initialise blockchain provider: ${error.message}`);
        throw error;
    }
};

export const getProvider = () => getBlockchainInstances().provider;
export const getSigner = () => getBlockchainInstances().signer;
export const getContract = () => getBlockchainInstances().contract;
